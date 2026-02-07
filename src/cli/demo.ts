import axios from 'axios'
import readline from 'readline'

const BASE = 'http://localhost:3000/api/v1'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function ask(q: string): Promise<string> {
  return new Promise((res) => rl.question(q, (a) => res(a.trim())))
}

let token: string | null = null

function api() {
  return axios.create({
    baseURL: BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
}

/* =========================
   REGISTER
========================= */

async function registerUser() {
  const username = await ask('Username: ')
  const password = await ask('Password: ')

  await axios.post(`${BASE}/auth/register`, {
    username,
    password
  })

  console.log('✅ Registered\n')
}

/* =========================
   LOGIN
========================= */

async function loginUser() {
  const username = await ask('Username: ')
  const password = await ask('Password: ')

  const resp = await axios.post(`${BASE}/auth/login`, { username, password })

  token = resp.data.token

  console.log('✅ Logged in')
  console.log('JWT captured\n')
}

/* =========================
   CONNECT UPS
========================= */

async function connectUps() {
  if (!token) {
    console.log('❌ Login first\n')
    return
  }

  const resp = await api().get('/carriers/ups/connect')

  console.log('\n🔗 Open this URL in browser:')
  console.log(resp.data.url, '\n')
}

/* =========================
   SIMULATE CALLBACK
========================= */

async function simulateCallback() {
  if (!token) {
    console.log('❌ Login first\n')
    return
  }

  const code = await ask('Fake code: ')
  const state = await ask('State(userId): ')

  const resp = await axios.get(`${BASE}/carriers/ups/callback`, {
    params: { code, state }
  })

  console.log('✅ Callback response:', resp.data, '\n')
}

/* =========================
   RATE REQUEST
========================= */

async function getRates() {
  if (!token) {
    console.log('❌ Login first\n')
    return
  }

  const fromZip = await ask('From ZIP: ')
  const toZip = await ask('To ZIP: ')
  const weight = await ask('Weight: ')

  const resp = await api().post('/rates', {
    carrier: 'ups',
    shipper: {
      city: 'NYC',
      state: 'NY',
      postalCode: fromZip,
      countryCode: 'US'
    },
    shipTo: {
      city: 'LA',
      state: 'CA',
      postalCode: toZip,
      countryCode: 'US'
    },
    pkg: {
      weight: Number(weight),
      length: 10,
      width: 8,
      height: 6
    }
  })

  console.log('\n💰 Quotes:')
  console.table(resp.data.quotes)
  console.log()
}

/* =========================
   STATUS
========================= */

async function statusCheck() {
  const r = await axios.get(`${BASE}/status`)
  console.log('Status:', r.data, '\n')
}

/* =========================
   MENU
========================= */

async function menu() {
  console.log('====== Carrier CLI ======')
  console.log('1. Status')
  console.log('2. Register')
  console.log('3. Login')
  console.log('4. Connect UPS')
  console.log('5. Simulate Callback')
  console.log('6. Get Rates')
  console.log('7. Exit\n')

  const c = await ask('Choose: ')

  try {
    if (c === '1') await statusCheck()
    else if (c === '2') await registerUser()
    else if (c === '3') await loginUser()
    else if (c === '4') await connectUps()
    else if (c === '5') await simulateCallback()
    else if (c === '6') await getRates()
    else if (c === '7') {
      rl.close()
      process.exit(0)
    }
  } catch (err: any) {
    if (err.response) {
      console.log('\n❌ API Error:')
      console.log(err.response.data, '\n')
    } else {
      console.log('\n❌ Error:', err.message, '\n')
    }
  }

  menu()
}

menu()
