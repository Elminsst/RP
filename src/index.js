const USERNAME = "Elmin"
const PASSWORD = "qaz741"

export default {
  async fetch(request, env) {

    const auth = request.headers.get("Authorization")

    // 没有登录
    if (!auth) {
      return new Response("Unauthorized", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="RP-Hub"'
        }
      })
    }

    const [scheme, encoded] = auth.split(" ")

    // 不是 Basic
    if (scheme !== "Basic") {
      return new Response("Invalid auth", {
        status: 401
      })
    }

    // 解码账号密码
    const decoded = atob(encoded)

    const [user, pass] = decoded.split(":")

    // 验证失败
    if (
      user !== USERNAME ||
      pass !== PASSWORD
    ) {
      return new Response("Forbidden", {
        status: 403
      })
    }

    // 验证成功
    return env.ASSETS.fetch(request)

  }
}
