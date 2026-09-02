/// <reference path="../pb_data/types.d.ts" />

routerAdd('POST', '/api/spendly/auth/login', (e) => {
  const data = new DynamicModel({
    email: '',
    password: '',
  })

  e.bindBody(data)

  const email = (data.email || '').trim().toLowerCase()
  const password = data.password || ''

  if (!email && !password) {
    return e.json(400, { field: 'both', message: 'Введите email и пароль' })
  }
  if (!email) {
    return e.json(400, { field: 'email', message: 'Введите email' })
  }
  if (!password) {
    return e.json(400, { field: 'password', message: 'Введите пароль' })
  }

  let record
  try {
    record = $app.findAuthRecordByEmail('users', email)
  } catch (_) {
    return e.json(400, { field: 'email', message: 'Пользователь с таким email не найден' })
  }

  if (!record.validatePassword(password)) {
    return e.json(400, { field: 'password', message: 'Неверный пароль' })
  }

  return $apis.recordAuthResponse(e, record, 'password')
})
