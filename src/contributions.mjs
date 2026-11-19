// Fetch the last year of daily contribution counts and save them to data/contributions.json.
// Needs GH_TOKEN (any token that can read public user data; a personal token also counts private work).
import { writeFile, mkdir } from "node:fs/promises";

const login = process.env.GH_LOGIN || "Toshkee";
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) throw new Error("Set GH_TOKEN (e.g. GH_TOKEN=$(gh auth token) node src/contributions.mjs)");

const query = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables: { login } }),
});
const json = await res.json();
if (json.errors) throw new Error(JSON.stringify(json.errors));

const cal = json.data.user.contributionsCollection.contributionCalendar;
const days = cal.weeks.flatMap((w) => w.contributionDays).map((d) => ({ date: d.date, count: d.contributionCount }));

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../data/contributions.json", import.meta.url),
  JSON.stringify({ login, total: cal.totalContributions, updated: new Date().toISOString(), days }, null, 2) + "\n",
);
console.log(`${login}: ${cal.totalContributions} contributions, ${days.length} days`);
