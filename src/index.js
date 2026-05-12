export default {

  async fetch(request, env) {

    const url = new URL(request.url)

    const cookie =
      request.headers.get("Cookie") || ""

    const loggedIn =
      cookie.includes("rp_auth=1")

    // 登录页
    if (url.pathname === "/login") {

      return new Response(`
        <form method="POST" action="/auth">
          <input name="password" type="password">
          <button>登录</button>
        </form>
      `, {
        headers: {
          "Content-Type": "text/html"
        }
      })
    }

    // 登录接口
    if (
      url.pathname === "/auth" &&
      request.method === "POST"
    ) {

      const form =
        await request.formData()

      const password =
        form.get("password")

      if (password === "123456") {

        return new Response(null, {
          status: 302,
          headers: {
            "Location": "/",
            "Set-Cookie":
              "rp_auth=1; Path=/;"
          }
        })
      }

      return new Response("密码错误")
    }

    // 未登录
    if (!loggedIn) {

      return Response.redirect(
        `${url.origin}/login`,
        302
      )
    }

    // 返回静态资源
    return env.ASSETS.fetch(request)

  }

}
