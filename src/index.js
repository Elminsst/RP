export default {
  async fetch(request, env) {

    return new Response(`
      <h1>WORKER OK</h1>
    `, {
      headers: {
        "Content-Type": "text/html"
      }
    })

  }
}
