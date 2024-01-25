export class ResolveError extends Error{
  constructor(public service, message: string = ""){
    super("could not resolve " + service.valueOf().toString() + message)
  }
}