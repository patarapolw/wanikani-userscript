import fs from 'fs'

import axios from 'axios'
import yaml from 'js-yaml'

interface IPost {
  id: string
  username: string
  cooked: string
}

interface ITopicPostResponse {
  post_stream: {
    posts: IPost[]
  }
}

interface ITopicResponse {
  actions_summary: {}[]
  archetype: string
  fancy_title: string
  title: string
  post_stream: {
    posts: IPost[]
    stream: number[]
  }
  posts_count: number
  reply_count: number
}

let vocabList: ITopicResponse | undefined

const urlBase = 'https://community.wanikani.com/t/shiritori/16404/9002'.replace(
  /\/t\/[^/]+\/(\d+)(\/.*)?$/,
  '/t/$1'
)

export async function fetchAll() {
  const vocabList = await jsonFetch<ITopicResponse>(urlBase + '.json')
  const stream = vocabList?.post_stream?.stream || []
  const chunks: number[][] = []
  while (stream.length) {
    chunks.push(stream.splice(0, 300))
  }

  const posts: IPost[] = []
  while (chunks.length) {
    const rs = await Promise.all(
      chunks.splice(0, 10).map((ids) =>
        jsonFetch<ITopicPostResponse>(urlBase + '/posts.json', {
          'post_ids[]': ids.join(',')
        })
      )
    ).then((rs) => rs.map((r) => r.post_stream.posts))

    rs.map((r) => {
      posts.push(...r)
    })

    if (chunks.length) {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  fs.writeFileSync('tmp/shiritori.yaml', yaml.dump(posts))
}

export async function jsonFetch<T>(url: string, data?: any): Promise<T> {
  return axios.get(url, { params: data }).then((r) => r.data)
}

async function main() {
  await fetchAll()
}

main()
