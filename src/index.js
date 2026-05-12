export default {

  async fetch(request, env) {

    const url = new URL(request.url)

    // 强制测试 Worker 是否运行
    if (url.pathname === "/test") {

      return new Response("WORKER OK")

    }

    // 登录页
    if (url.pathname === "/login") {

      return new Response(`
        <h1>LOGIN PAGE</h1>
      `, {
        headers: {
          "Content-Type": "text/html"
        }
      })

    }

    // 所有其他请求
    return env.ASSETS.fetch(request)

  }

}
