/// <reference path="../pb_data/types.d.ts" />

function hasField(collection, name) {
  try {
    collection.fields.getByName(name)
    return true
  } catch (_) {
    return false
  }
}

function hasCollection(app, name) {
  try {
    app.findCollectionByNameOrId(name)
    return true
  } catch (_) {
    return false
  }
}

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    if (!hasField(users, 'name')) {
      users.fields.add(
        new Field({
          name: 'name',
          type: 'text',
          required: true,
        }),
      )
    }

    if (!hasField(users, 'currency')) {
      users.fields.add(
        new Field({
          name: 'currency',
          type: 'text',
          required: true,
        }),
      )
    }

    users.createRule = ''
    users.updateRule = 'id = @request.auth.id'
    users.viewRule = 'id = @request.auth.id'
    app.save(users)

    const usersId = users.id
    const ownerRule = 'user = @request.auth.id'
    const authRequired = '@request.auth.id != ""'

    const collections = [
      {
        name: 'periods',
        fields: [
          { name: 'user', type: 'relation', required: true, collectionId: usersId, cascadeDelete: true, maxSelect: 1 },
          { name: 'name', type: 'text', required: true },
          { name: 'startDate', type: 'text', required: true },
          { name: 'endDate', type: 'text' },
          { name: 'initialCapital', type: 'number', required: true },
        ],
      },
      {
        name: 'transactions',
        fields: [
          { name: 'user', type: 'relation', required: true, collectionId: usersId, cascadeDelete: true, maxSelect: 1 },
          { name: 'period', type: 'relation', required: true, collectionId: '', maxSelect: 1 },
          { name: 'type', type: 'select', required: true, maxSelect: 1, values: ['income', 'expense', 'saving_deposit', 'saving_withdraw', 'saving_transfer'] },
          { name: 'amount', type: 'number', required: true },
          { name: 'category', type: 'text', required: true },
          { name: 'title', type: 'text', required: true },
          { name: 'note', type: 'text' },
          { name: 'date', type: 'text', required: true },
          { name: 'savingId', type: 'text' },
          { name: 'sourceSavingId', type: 'text' },
          { name: 'destinationSavingId', type: 'text' },
          { name: 'balanceAfter', type: 'number' },
        ],
      },
      {
        name: 'savings',
        fields: [
          { name: 'user', type: 'relation', required: true, collectionId: usersId, cascadeDelete: true, maxSelect: 1 },
          { name: 'name', type: 'text', required: true },
          { name: 'description', type: 'text' },
          { name: 'icon', type: 'text', required: true },
          { name: 'targetAmount', type: 'number' },
          { name: 'currentAmount', type: 'number', required: true },
          { name: 'targetDate', type: 'text' },
          { name: 'isCompleted', type: 'bool' },
          { name: 'completedAt', type: 'text' },
          { name: 'autoDepositAmount', type: 'number' },
          { name: 'autoDepositDay', type: 'number' },
          { name: 'lastAutoDepositPromptMonth', type: 'text' },
        ],
      },
      {
        name: 'user_settings',
        fields: [
          { name: 'user', type: 'relation', required: true, unique: true, collectionId: usersId, cascadeDelete: true, maxSelect: 1 },
          { name: 'theme', type: 'select', required: true, maxSelect: 1, values: ['dark', 'light'] },
          { name: 'customCategories', type: 'json' },
          { name: 'customCategoryIcons', type: 'json' },
        ],
      },
    ]

    for (const item of collections) {
      if (hasCollection(app, item.name)) continue

      const collection = new Collection({
        name: item.name,
        type: 'base',
        listRule: ownerRule,
        viewRule: ownerRule,
        createRule: authRequired,
        updateRule: ownerRule,
        deleteRule: ownerRule,
        fields: [],
      })

      for (const field of item.fields) {
        if (field.name === 'period' && item.name === 'transactions') {
          field.collectionId = app.findCollectionByNameOrId('periods').id
        }
        collection.fields.add(new Field(field))
      }

      app.save(collection)
    }
  },
  (app) => {
    for (const name of ['user_settings', 'savings', 'transactions', 'periods']) {
      try {
        app.delete(app.findCollectionByNameOrId(name))
      } catch (_) {}
    }
  },
)
