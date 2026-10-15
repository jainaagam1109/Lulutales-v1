import { readFileSync } from "fs";
import path from "path";
import type { Plugin } from "vite";

/**
 * Ships the welcome page's words inside index.html itself, so tools that read a page
 * without running its code (many AI answer tools) still see what LuluTales is.
 *
 * Only in production builds. In the browser:
 *  - a tiny script hides this copy straight away for signed-in parents, inside the Lovable
 *    editor preview, and on any page other than "/" and "/welcome";
 *  - on phones it stays hidden (it is the laptop version; the phone version loads as before);
 *  - main.tsx moves it out of React's way, and the real welcome page removes it the moment
 *    it appears, so visitors never see two copies.
 */
export const prerenderWelcome = (): Plugin => ({
  name: "lt-prerender-welcome",
  apply: "build",
  transformIndexHtml(html) {
    const desktop = readFileSync(path.resolve(__dirname, "../src/pages/welcome/desktop.html"), "utf8");
    const head = `
    <style>
      html.lt-no-pre #lt-prerender{display:none}
      #lt-prerender *{animation:none!important}
      @media (max-width:760px){#lt-prerender{display:none}}
    </style>
    <script>
      (function () {
        var hide = true;
        try {
          var p = location.pathname.replace(/\\/+$/, "") || "/";
          var signedIn = !!localStorage.getItem("sb-lidbfkytoajumnhwlcry-auth-token");
          var authReturn = /access_token|type=recovery/.test(location.hash) || /[?&]code=/.test(location.search);
          hide = !(p === "/" || p === "/welcome") || signedIn || authReturn || window.parent !== window;
        } catch (e) { hide = true; }
        if (hide) document.documentElement.classList.add("lt-no-pre");
      })();
    </script>
  </head>`;
    return html
      .replace("</head>", head)
      .replace(
        '<div id="root"></div>',
        `<div id="lt-prerender" class="lt-welcome"><div class="lt-welcome-d">${desktop}</div></div>\n    <div id="root"></div>`,
      );
  },
});

export default prerenderWelcome;
