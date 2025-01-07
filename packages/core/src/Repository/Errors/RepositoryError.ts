class RepositoryError extends Error {
	constructor(message?: string, options?: ErrorOptions) {
		super(message, options)

		this.name = 'RepositoryError'
	}
}

export default RepositoryError
