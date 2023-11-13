/////////////////////////////////////////////////////////////////////////////////
// serverless telegram bot connected to database channel
// Creator: Arashnm80
// https://github.com/arashnm80/worker-telegram-bot-with-database-channel
/////////////////////////////////////////////////////////////////////////////////

const TOKEN = "" // Get it from @BotFather https://core.telegram.org/bots#6-botfather
const databaseChannel = "" // database channel that holds responses
const SECRET = "" // A-Z, a-z, 0-9, _ and -

const commands = { // numbers are message IDs in the database channel
  "/example": 5, // can be a command
  "another example": 6, // can be a normal text
  "حالت چطوره": 10, // can be in any language
  "multiple examples": [15, 16, 17, 18] // can be a list of messages
}


/////////////////////////////////////////////////////////////////////////////////

// other vars
const WEBHOOK = '/endpoint'

/**
 * Wait for requests to the worker
 */
addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.pathname === WEBHOOK) {
    event.respondWith(handleWebhook(event))
  } else if (url.pathname === '/registerWebhook') {
    event.respondWith(registerWebhook(event, url, WEBHOOK, SECRET))
  } else if (url.pathname === '/unRegisterWebhook') {
    event.respondWith(unRegisterWebhook(event))
  } else {
    event.respondWith(new Response('No handler for this request'))
  }
})

/**
 * Handle requests to WEBHOOK
 * https://core.telegram.org/bots/api#update
 */
async function handleWebhook (event) {
  // Check secret
  if (event.request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== SECRET) {
    return new Response('Unauthorized', { status: 403 })
  }

  // Read request body synchronously
  const update = await event.request.json()
  // Deal with response asynchronously
  event.waitUntil(onUpdate(update))

  return new Response('Ok')
}

/**
 * Handle incoming Update
 * https://core.telegram.org/bots/api#update
 */
async function onUpdate (update) {
  if ('message' in update) {
    await onMessage(update.message)
  }
}

/**
 * Handle incoming Message
 * https://core.telegram.org/bots/api#message
 */
async function onMessage (message) {
  var command = message.text
  if(command in commands){
    if(Array.isArray(commands[command])){ // it is a list of messages
      var returnMessage;
      for (let c of commands[command]) {
        returnMessage = await copyMessage(message.chat.id, databaseChannel, c)
      }
      return returnMessage;
    } else { // it is a single message
      return copyMessage(message.chat.id, databaseChannel, commands[command])
    }
  } else {
    return sendPlainText(message.chat.id, 'command not defined.')
  }
}

/**
 * Send plain text message
 * https://core.telegram.org/bots/api#sendmessage
 */
async function sendPlainText (chatId, text) {
  return (await fetch(apiUrl('sendMessage', {
    chat_id: chatId,
    text
  }))).json()
}

/**
 * Set webhook to this worker's url
 * https://core.telegram.org/bots/api#setwebhook
 */
async function registerWebhook (event, requestUrl, suffix, secret) {
  // https://core.telegram.org/bots/api#setwebhook
  const webhookUrl = `${requestUrl.protocol}//${requestUrl.hostname}${suffix}`
  const r = await (await fetch(apiUrl('setWebhook', { url: webhookUrl, secret_token: secret }))).json()
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

/**
 * Remove webhook
 * https://core.telegram.org/bots/api#setwebhook
 */
async function unRegisterWebhook (event) {
  const r = await (await fetch(apiUrl('setWebhook', { url: '' }))).json()
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

/**
 * Return url to telegram api, optionally with parameters added
 */
function apiUrl (methodName, params = null) {
  let query = ''
  if (params) {
    query = '?' + new URLSearchParams(params).toString()
  }
  return `https://api.telegram.org/bot${TOKEN}/${methodName}${query}`
}

/**
 * Copy message from database channel
 * https://core.telegram.org/bots/api#copymessage
 */
async function copyMessage (chatId, fromChatId, messageId) {
  return (await fetch(apiUrl('copyMessage', {
    chat_id: chatId,
    from_chat_id: fromChatId,
    message_id: messageId
  }))).json()
}
