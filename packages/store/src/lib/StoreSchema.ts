import { Result, exhaustiveSwitchError, getOwnProperty, structuredClone } from '@tldraw/utils'
import { UnknownRecord } from './BaseRecord'
import { RecordType } from './RecordType'
import { SerializedStore, Store, StoreSnapshot } from './Store'
import {
	Migration,
	MigrationFailureReason,
	MigrationResult,
	Migrations,
	parseMigrationId,
	sortMigrations,
} from './migrate'

/** @public */
export interface SerializedSchemaV1 {
	/** Schema version is the version for this type you're looking at right now */
	schemaVersion: 1
	/**
	 * Store version is the version for the structure of the store. e.g. higher level structure like
	 * removing or renaming a record type.
	 */
	storeVersion: number
	/** Record versions are the versions for each record type. e.g. adding a new field to a record */
	recordVersions: Record<
		string,
		| {
				version: number
		  }
		| {
				// subtypes are used for migrating shape and asset props
				version: number
				subTypeVersions: Record<string, number>
				subTypeKey: string
		  }
	>
}

export interface SerializedSchemaV2 {
	schemaVersion: 2
	sequences: {
		[sequenceId: string]: number
	}
}

export type SerializedSchema = SerializedSchemaV1 | SerializedSchemaV2

export function upgradeSchema(schema: SerializedSchema): SerializedSchemaV2 {
	if (schema.schemaVersion === 2) return schema
	const result: SerializedSchemaV2 = {
		schemaVersion: 2,
		sequences: {},
	}

	for (const [typeName, recordVersion] of Object.entries(schema.recordVersions)) {
		if ('subTypeKey' in recordVersion) {
			result.sequences[`com.tldraw/${typeName}.${recordVersion.subTypeKey}`] = 0
		} else {
			result.sequences[`com.tldraw/${typeName}`] = 0
		}
	}
	return result
}

/** @public */
export type StoreSchemaOptions<R extends UnknownRecord, P> = {
	migrations?: Record<string, Migrations>
	/** @public */
	onValidationFailure?: (data: {
		error: unknown
		store: Store<R>
		record: R
		phase: 'initialize' | 'createRecord' | 'updateRecord' | 'tests'
		recordBefore: R | null
	}) => R
	/** @internal */
	createIntegrityChecker?: (store: Store<R, P>) => void
}

/** @public */
export class StoreSchema<R extends UnknownRecord, P = unknown> {
	static create<R extends UnknownRecord, P = unknown>(
		// HACK: making this param work with RecordType is an enormous pain
		// let's just settle for making sure each typeName has a corresponding RecordType
		// and accept that this function won't be able to infer the record type from it's arguments
		types: { [TypeName in R['typeName']]: { createId: any } },
		options?: StoreSchemaOptions<R, P>
	): StoreSchema<R, P> {
		return new StoreSchema<R, P>(types as any, options ?? {})
	}

	readonly migrations: Record<string, Migrations> = {}

	private constructor(
		public readonly types: {
			[Record in R as Record['typeName']]: RecordType<R, any>
		},
		private readonly options: StoreSchemaOptions<R, P>
	) {
		this.migrations = options.migrations ?? {}
	}

	validateRecord(
		store: Store<R>,
		record: R,
		phase: 'initialize' | 'createRecord' | 'updateRecord' | 'tests',
		recordBefore: R | null
	): R {
		try {
			const recordType = getOwnProperty(this.types, record.typeName)
			if (!recordType) {
				throw new Error(`Missing definition for record type ${record.typeName}`)
			}
			return recordType.validate(record, recordBefore ?? undefined)
		} catch (error: unknown) {
			if (this.options.onValidationFailure) {
				return this.options.onValidationFailure({
					store,
					record,
					phase,
					recordBefore,
					error,
				})
			} else {
				throw error
			}
		}
	}

	// TODO: use a weakmap to store the result of this function
	public getMigrationsSince(persistedSchema: SerializedSchema): Result<Migration[], string> {
		const schema = upgradeSchema(persistedSchema)
		const sequenceIdsToInclude = new Set(
			// start with any shared sequences
			Object.keys(schema.sequences).filter((sequenceId) => this.migrations[sequenceId])
		)

		if (sequenceIdsToInclude.size === 0) {
			return Result.ok([])
		}

		const result: Migration[] = []
		for (const sequenceId of sequenceIdsToInclude) {
			const theirVersionNumber = schema.sequences[sequenceId]
			if (
				// Special case for legacy situations where there was no schema.
				// This also happens when an empty schema is passed in.
				theirVersionNumber === -1 ||
				(typeof theirVersionNumber === 'undefined' && this.migrations[sequenceId].postHoc)
			) {
				result.push(...this.migrations[sequenceId].sequence)
				continue
			}
			const theirVersionId = `${sequenceId}/${schema.sequences[sequenceId]}`
			const idx = this.migrations[sequenceId].sequence.findIndex((m) => m.id === theirVersionId)
			// todo: better error handling
			if (idx === -1) return Result.err('Incompatible schema?')
			result.push(...this.migrations[sequenceId].sequence.slice(idx + 1))
		}

		// collect any migrations
		return Result.ok(sortMigrations(result))
	}

	migratePersistedRecord(
		record: R,
		persistedSchema: SerializedSchema,
		direction: 'up' | 'down' = 'up'
	): MigrationResult<R> {
		const migrations = this.getMigrationsSince(persistedSchema)
		if (!migrations.ok) {
			// TODO: better error
			return { type: 'error', reason: MigrationFailureReason.MigrationError }
		}
		let migrationsToApply = migrations.value
		if (migrationsToApply.length === 0) {
			return { type: 'success', value: record }
		}

		if (migrationsToApply.some((m) => m.scope === 'store')) {
			return {
				type: 'error',
				reason:
					direction === 'down'
						? MigrationFailureReason.TargetVersionTooOld
						: MigrationFailureReason.TargetVersionTooNew,
			}
		}

		if (direction === 'down') {
			if (!migrationsToApply.every((m) => m.down)) {
				return {
					type: 'error',
					reason: MigrationFailureReason.TargetVersionTooOld,
				}
			}
			migrationsToApply = migrationsToApply.slice().reverse()
		}

		record = structuredClone(record)
		try {
			for (const migration of migrationsToApply) {
				if (migration.scope === 'store') throw new Error(/* won't happen, just for TS */)
				const result = migration[direction]!(record)
				if (result) {
					record = structuredClone(result) as any
				}
			}
		} catch (e) {
			return { type: 'error', reason: MigrationFailureReason.MigrationError }
		}

		return { type: 'success', value: record }
	}

	migrateStoreSnapshot(snapshot: StoreSnapshot<R>): MigrationResult<SerializedStore<R>> {
		let { store } = snapshot
		const migrations = this.getMigrationsSince(snapshot.schema)
		if (!migrations.ok) {
			// TODO: better error
			return { type: 'error', reason: MigrationFailureReason.MigrationError }
		}
		const migrationsToApply = migrations.value
		if (migrationsToApply.length === 0) {
			return { type: 'success', value: store }
		}

		store = structuredClone(store)

		try {
			for (const migration of migrationsToApply) {
				if (migration.scope === 'record') {
					for (const [id, record] of Object.entries(store)) {
						const result = migration.up!(record as any)
						if (result) {
							store[id as keyof typeof store] = structuredClone(result) as any
						}
					}
					Object.values(store).forEach((r) => migration.up!(r as any))
				} else if (migration.scope === 'store') {
					const result = migration.up!(store)
					if (result) {
						store = structuredClone(result) as any
					}
				} else {
					exhaustiveSwitchError(migration)
				}
			}
		} catch (e) {
			return { type: 'error', reason: MigrationFailureReason.MigrationError }
		}

		return { type: 'success', value: store }
	}

	/** @internal */
	createIntegrityChecker(store: Store<R, P>): (() => void) | undefined {
		return this.options.createIntegrityChecker?.(store) ?? undefined
	}

	serialize(): SerializedSchemaV2 {
		return {
			schemaVersion: 2,
			sequences: Object.fromEntries(
				Object.entries(this.migrations).map(([sequenceId, { sequence }]) => [
					sequenceId,
					sequence.length ? parseMigrationId(sequence.at(-1)!.id).version : -1,
				])
			),
		}
	}

	/**
	 * @deprecated This is only here for legacy reasons, don't use it unless you have david's blessing!
	 */
	serializeEarliestVersion(): SerializedSchema {
		return {
			schemaVersion: 2,
			sequences: Object.fromEntries(
				Object.keys(this.migrations).map((sequenceId) => [sequenceId, -1])
			),
		}
	}
}
