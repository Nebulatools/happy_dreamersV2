export interface Child {
  id: string
  firstName: string
  lastName?: string
  birthDate: Date
  gender?: "male" | "female" | "other"
}
