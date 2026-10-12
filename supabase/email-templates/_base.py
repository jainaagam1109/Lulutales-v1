# Builds the two LuluTales emails (email-safe HTML: tables + inline styles).
VIOLET="#5B4BD6"; INK="#2A2540"; BODY="#3D3856"; MUTED="#6B6785"; CREAM="#FBEFE2"; PAPER="#F8F7FC"; LINE="#E4E1EE"
FONT="'Plus Jakarta Sans',Arial,Helvetica,sans-serif"; HEAD="Quicksand,'Trebuchet MS',Arial,sans-serif"

def button(label, href):
    return f'''<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px"><tr><td style="border-radius:999px;background:{VIOLET}">
<a href="{href}" style="display:inline-block;padding:15px 28px;font-family:{FONT};font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px">{label}</a></td></tr></table>'''

def page(preheader, inner):
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>LuluTales</title></head>
<body style="margin:0;padding:0;background:{PAPER}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">{preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{PAPER}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
<tr><td style="padding:0 8px 18px">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="width:34px;height:34px;border-radius:50%;background:{VIOLET};text-align:center;vertical-align:middle;font-family:{HEAD};font-size:18px;font-weight:700;color:#FFFFFF">L</td>
    <td style="padding-left:10px;font-family:{HEAD};font-size:22px;color:{INK}"><b>Lulu</b>Tales</td>
  </tr></table>
</td></tr>
<tr><td style="background:#FFFFFF;border:1px solid {LINE};border-radius:24px;padding:32px 28px;font-family:{FONT};font-size:16px;line-height:1.6;color:{BODY}">
{inner}
</td></tr>
<tr><td style="padding:20px 8px;font-family:{FONT};font-size:13px;line-height:1.6;color:{MUTED};text-align:center">
Questions? Just reply to this email. It comes straight to us.<br>
LuluTales · Personalised stories that help children grow · <a href="https://lulutales.in" style="color:{MUTED}">lulutales.in</a>
</td></tr>
</table></td></tr></table></body></html>'''

def h1(t): return f'<h1 style="margin:0 0 14px;font-family:{HEAD};font-size:26px;line-height:1.25;color:{INK}">{t}</h1>'
def p(t, extra=""): return f'<p style="margin:0 0 14px;{extra}">{t}</p>'
def box(t): return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px"><tr><td style="background:{CREAM};border-radius:18px;padding:18px 20px;font-family:{FONT};font-size:15px;line-height:1.6;color:{INK}">{t}</td></tr></table>'
def item(title, text): return f'''<tr><td style="padding:0 0 12px;vertical-align:top;width:26px"><div style="width:20px;height:20px;border-radius:50%;background:{VIOLET};color:#fff;font-size:12px;line-height:20px;text-align:center;font-weight:700">&#10003;</div></td>
<td style="padding:0 0 12px 8px;font-family:{FONT};font-size:15px;line-height:1.55;color:{BODY}"><b style="color:{INK}">{title}</b> {text}</td></tr>'''

def welcome(child):
    inner = (h1("Thank you for joining LuluTales")
      + p("Hi there,")
      + p(f"Thank you for registering <b style=\"color:{INK}\">{child}</b> with LuluTales. We’re so glad you’re here.")
      + p("We’re welcoming families a few at a time, so every child gets our full care. Our team will review your request shortly, and you’ll receive an email from us as soon as you’re in.")
      + box("<b>While you wait, the story library is open.</b><br>Calm bedtime stories, first-day courage, sharing, big feelings and more. Every story is designed with certified child psychologists, in English and हिंदी.")
      + button("Explore the story library", "https://lulutales.in/library")
      + p("Have a friend who’s already on LuluTales? Ask them for their invite link and you’ll skip the wait.", f"margin-top:18px;font-size:15px;color:{MUTED}")
      + p(f"Warmly,<br><b style=\"color:{INK}\">The LuluTales team</b>", "margin:18px 0 0"))
    return page(f"Thank you for registering {child}. Here’s what happens next.", inner)

def youre_in(child):
    items = "".join([
      item(f"Stories starring {child}.", f"{child} is the hero, with your family’s names, your city and the things they love."),
      item("A story for the moment they’re in.", "First day at school, a new sibling, bedtime fears, sharing toys. Pick the moment and we write the story around it."),
      item("Listen or read together.", "A warm voice tells it, no screen needed. Or read it aloud at bedtime. In English or हिंदी."),
      item("5 new stories every month,", "plus the full story library and story worlds."),
      item("Invite friends.", "They skip the wait, and you get 2 extra stories for each friend who joins."),
    ])
    inner = (h1(f"You’re in. Let’s make {child}’s first story")
      + p("Hi there,")
      + p(f"Great news: your family is now one of LuluTales’ <b style=\"color:{INK}\">founding families</b>. Everything is free until 31 December 2026.")
      + button(f"Make {child}’s first story", "https://lulutales.in/magic-hub")
      + f'<h2 style="margin:26px 0 12px;font-family:{HEAD};font-size:19px;color:{INK}">What you can do</h2>'
      + f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">{items}</table>'
      + box(f"<b>How it helps {child}</b><br>Every LuluTales story is designed with certified child psychologists. When children hear themselves as the hero, solving a problem they really face, they practise courage, kindness and calm in a safe way. Each story quietly builds one skill, and you can see what {child} is learning in the Parents section.")
      + button(f"Make {child}’s first story", "https://lulutales.in/magic-hub")
      + p(f"Warmly,<br><b style=\"color:{INK}\">The LuluTales team</b>", "margin:22px 0 0"))
    return page(f"Your family is in. Make {child}’s first personalised story tonight.", inner)

if __name__ == "__main__":
    open("welcome-preview.html","w").write(welcome("Ashu"))
    open("youre-in-preview.html","w").write(youre_in("Ashu"))
