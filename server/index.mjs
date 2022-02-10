import fastify from 'fastify'
import fastifyStatic from 'fastify-static'
import axios from 'axios'
import path from 'path'

const isDev = process.env.NODE_ENV === 'development'

const app = fastify({
  logger: {
    prettyPrint: isDev
  }
})
const port = process.env.PORT || 8080

app.get(
  '/api/nocors',
  {
    schema: {
      querystring: {
        type: 'object',
        required: ['url'],
        url: { type: 'string' }
      }
    }
  },
  async (req) => {
    const { url } = req.query

    const { data: html } = await axios.get(url)
    return html
  }
)

app.register(fastifyStatic, {
  root: path.resolve('public')
})

app.listen(port, isDev ? 'localhost' : '0.0.0.0')
