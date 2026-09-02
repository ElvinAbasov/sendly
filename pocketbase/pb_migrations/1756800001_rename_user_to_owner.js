/// <reference path="../pb_data/types.d.ts" />

function renameUserField(collection) {
  try {
    const field = collection.fields.getByName('user')
    field.name = 'owner'
  } catch (_) {
    // already migrated or fresh install with owner field
  }
}

migrate(
  (app) => {
    const ownerRule = 'owner = @request.auth.id'

    for (const name of ['periods', 'transactions', 'savings', 'user_settings']) {
      const collection = app.findCollectionByNameOrId(name)
      renameUserField(collection)
      collection.listRule = ownerRule
      collection.viewRule = ownerRule
      collection.updateRule = ownerRule
      collection.deleteRule = ownerRule
      app.save(collection)
    }
  },
  (app) => {
    const userRule = 'user = @request.auth.id'

    for (const name of ['periods', 'transactions', 'savings', 'user_settings']) {
      const collection = app.findCollectionByNameOrId(name)
      try {
        const field = collection.fields.getByName('owner')
        field.name = 'user'
      } catch (_) {}
      collection.listRule = userRule
      collection.viewRule = userRule
      collection.updateRule = userRule
      collection.deleteRule = userRule
      app.save(collection)
    }
  },
)
