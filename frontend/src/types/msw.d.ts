declare module 'msw/browser' {
  export function setupWorker(...handlers: any[]): any;
}

declare module 'msw' {
  export const http: any;
  export const HttpResponse: any;
}
