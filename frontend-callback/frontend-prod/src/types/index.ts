
export type Callback = {
    id: string
    telefono: string
    queue: string
    estado: string
    fechaProgramada: string
    intentos: number
    agente: string
}

export type Queue = {
    id: string
    name: string
    description: string
    status: string
    active: boolean
    max_retry_attempts: number
    retry_attempt_interval: string
    stop_on_voicemail: boolean
    createdAt: string
    updatedAt: string
}
