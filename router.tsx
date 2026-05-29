import { Switch, Route } from "wouter";
import Home from "@/pages/home";
import Scores from "@/pages/scores";
import Standings from "@/pages/standings";
import Scorers from "@/pages/scorers";
import Team from "@/pages/team";
import News from "@/pages/news";
import Match from "@/pages/match";
import NotFound from "@/pages/not-found";

export function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/scores" component={Scores} />
      <Route path="/standings" component={Standings} />
      <Route path="/scorers" component={Scorers} />
      <Route path="/team" component={Team} />
      <Route path="/news" component={News} />
      <Route path="/match/:id" component={Match} />
      <Route component={NotFound} />
    </Switch>
  );
}
