import 'dotenv/config'
import Fastify from 'fastify'
import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'

type DB = {
	admins: { id: number, email: string, passwordHash: string }[],
	users: { id: number, email: string }[],
	enrollments: { id: number, userId: number, code: string, exp: number }[],
	credentials: { id: number, userId: number, enrollmentId: number, publicKey: string }[]
}

const db: DB = {
	admins: [
		{
			id: 1,
			email: 'hayden@higginbotham.io',
			passwordHash: '$argon2id$v=19$m=65536,p=4,t=3$gjntwbi4ubWncVF4fuGiUA$8UFk0UEzM6cS8mv1aObQiw4se8IFuD4gnVVfOGanCk8'
		}
	],
	users: [
		{
			id: 1,
			email: 'hayden@higginbotham.io'
		}
	],
	enrollments: [],
	credentials: []
}

const fastify = Fastify()

fastify.get('/', (_, reply) => {
	reply.send({ time: new Date().getTime() })
})

// auth
interface ILogInBody {
  email: string
  password: string
}

interface ILogInReply {
  200: { token: string }
	401: { error: string }
  500: { error: string }
}

fastify.post<{
	Body: ILogInBody, Reply: ILogInReply
}>('/log-in', async (request, reply) => {
	if (!process.env.secret) {
		reply.code(500).send({ error: 'server error' })
		return
	}

	const verifier = db.admins.find((admin) => admin.email === request.body.email)
	if (!verifier) {
		reply.code(401).send({ error: 'invalid email or password' })
		return
	}

	const ok = await argon2.verify(verifier.passwordHash, request.body.password)
	if (!ok) {
		reply.code(401).send({ error: 'invalid email or password' })
		return
	}

	reply.code(200).send({
		token: jwt.sign({
			exp: Math.floor(Date.now() / 1000) + (60 * 60)
		}, process.env.secret ?? '')
	})
})

// enroll
interface IEnrollParams {
	userId: number
}

interface IEnrollReply {
  201: { code: string, exp: number }
	'4xx': { error: string }
  500: { error: string }
}

fastify.post<{
	Params: IEnrollParams, Reply: IEnrollReply
}>('/users/:userId/enrollment', async (request, reply) => {
	if (!process.env.secret) {
		reply.code(500).send({ error: 'server error' })
		return
	}

	const [authType, token] = request.headers.authorization?.split(' ', 2) ?? []
	if (authType !== 'Bearer') {
		reply.code(401).send({ error: 'no token' })
		return
	}

	const ok = jwt.verify(token, process.env.secret ?? '')
	if (!ok) {
		reply.code(403).send({ error: 'invalid token' })
		return
	}

	const user = db.users.find((user) => user.id == +request.params.userId)
	if (!user) {
		reply.code(404).send({ error: 'no user' })
		return
	}

	const enrollment = {
		code: randomUUID(),
		exp: Math.floor(Date.now() / 1000) + (5 * 60)
	}

	db.enrollments.push({ id: 1, userId: user.id, ...enrollment })

	reply.code(201).send(enrollment)
})

// register
interface IRegisterParams {
	userId: number
}

interface IRegisterReply {
  201: { key: string, exp: number }
	'4xx': { error: string }
  500: { error: string }
}

fastify.put<{
	Params: IRegisterParams, Reply: IRegisterReply
}>('/users/:userId/enrollment/:code', async (request, reply) => {

})

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) throw err
  console.log(`listening at ${address}`)
})
