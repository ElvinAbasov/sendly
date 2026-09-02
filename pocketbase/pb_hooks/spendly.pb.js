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
    return e.json(400, { field: 'both', code: 'auth.validation.emailAndPasswordRequired' })
  }
  if (!email) {
    return e.json(400, { field: 'email', code: 'auth.validation.emailRequired' })
  }
  if (!password) {
    return e.json(400, { field: 'password', code: 'auth.validation.passwordRequired' })
  }

  let record
  try {
    record = $app.findAuthRecordByEmail('users', email)
  } catch (_) {
    return e.json(400, { field: 'email', code: 'auth.errors.userNotFound' })
  }

  if (!record.validatePassword(password)) {
    return e.json(400, { field: 'password', code: 'auth.errors.wrongPassword' })
  }

  return $apis.recordAuthResponse(e, record, 'password')
})
