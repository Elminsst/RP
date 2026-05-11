export default {
  async fetch(request, env) {

    await env.RPKV.put("hello", "world")

    const value = await env.RPKV.get("hello")

    return new Response(value)

  }
}
