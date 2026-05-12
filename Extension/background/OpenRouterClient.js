// background/OpenRouterClient.js — OpenRouter API 呼叫

import { ResponseParser } from './ResponseParser.js'
import { ErrorClassifier } from './ErrorClassifier.js'

const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export class OpenRouterClient {
  constructor() {
    this.parser = new ResponseParser()
    this.classifier = new ErrorClassifier()
  }

  async call({ apiKey, modelName, systemPrompt, userPrompt, temperature = 0.1, maxTokens = 512, stream = false }) {
    if (!apiKey) throw new Error('API Key 未設定，請至設定頁填寫。')
    if (!modelName) throw new Error('Model ID 未設定，請至設定頁填寫。')

    const body = {
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: maxTokens,
      temperature,
      stream
    }

    let response
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      })
    } catch (networkError) {
      const { message } = this.classifier.classify(null)
      throw new Error(message)
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '')
      const { message } = this.classifier.classify(response.status, bodyText, response.headers)
      throw new Error(message)
    }

    if (stream) {
      return this._readStream(response)
    }

    const data = await response.json()
    return this.parser.parse(data)
  }

  async _readStream(response) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value, { stream: true })
      const lines = text.split('\n')

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const chunk = line.slice(6).trim()
        const result = this.parser.parseChunk(chunk, accumulated)
        accumulated = result.accumulated
        if (result.done) return accumulated
      }
    }

    return accumulated
  }
}
