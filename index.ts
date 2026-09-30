import Fastify from 'fastify'

const fastify = Fastify()

fastify.get('/', (request, reply) => {
  reply.send({ hello: 'world' })
})

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
	}
  console.log(`listening at ${address}`)
})
