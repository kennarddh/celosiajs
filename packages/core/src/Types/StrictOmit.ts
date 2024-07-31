import { EmptyObject } from '../'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type StrictOmit<T, K extends keyof T> = {} extends Omit<T, K> ? EmptyObject : Omit<T, K>

export default StrictOmit
