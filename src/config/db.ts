import mongoose from 'mongoose'

export async function conectar() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGO_DB_NAME?.trim()
  if (!uri) {
    throw new Error(
      'Falta MONGODB_URI. Copia .env.example a .env y pega la cadena de conexión de MongoDB Atlas.',
    )
  }
  if (!dbName) {
    throw new Error('Falta MONGO_DB_NAME. Indica el nombre de la base de datos en .env.')
  }

  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 10000,
  })
}

export async function desconectar() {
  await mongoose.disconnect()
}
