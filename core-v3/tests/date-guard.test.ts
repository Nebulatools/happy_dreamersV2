import fs from "fs"
import path from "path"

describe("v3 date comparisons guard", () => {
  it("no debe contener comparaciones de fechas como string en core-v3", () => {
    const root = path.join(process.cwd(), "core-v3")
    const stack = collectTs(root)
    const suspicious = stack.filter((c) =>
      /toISOString\(\)/.test(c.content) && /\$gte|\$lte|\$gt|\$lt/.test(c.content)
    )
    expect(suspicious.length).toBe(0)
  })
})

function collectTs(dir: string): { file: string; content: string }[] {
  const out: { file: string; content: string }[] = []
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) out.push(...collectTs(full))
    else if (entry.endsWith(".ts")) {
      out.push({ file: full, content: fs.readFileSync(full, "utf8") })
    }
  }
  return out
}
