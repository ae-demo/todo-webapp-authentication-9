import type { JSX } from "react";
import { Outlet, Link } from "react-router-dom";
import {
  AppShell as OxygenAppShell,
  Header,
  Sidebar,
  Footer,
  UserMenu,
  ColorSchemeToggle,
  Divider,
} from "@wso2/oxygen-ui";
import { ListChecks, LogOut } from "@wso2/oxygen-ui-icons-react";
import { APP_NAME } from "../appName";
import { useAuthz } from "../authz/gates";
import { signOut } from "../authz/session";

/** The app's one shell — every gated screen renders inside it (AppShell.Main). */
export function AppShell(): JSX.Element {
  const { username } = useAuthz();

  return (
    <OxygenAppShell>
      <OxygenAppShell.Navbar>
        <Header>
          <Header.Toggle />
          <Header.Brand>
            <Header.BrandTitle>{APP_NAME}</Header.BrandTitle>
          </Header.Brand>
          <Header.Spacer />
          <Header.Actions>
            <ColorSchemeToggle />
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <UserMenu>
              <UserMenu.Trigger name={username || "Signed in"} />
              <UserMenu.Header name={username || "Signed in"} email={username} />
              <UserMenu.Logout icon={<LogOut size={16} />} onClick={() => void signOut()} />
            </UserMenu>
          </Header.Actions>
        </Header>
      </OxygenAppShell.Navbar>

      <OxygenAppShell.Sidebar>
        <Sidebar activeItem="todos">
          <Sidebar.Nav>
            <Sidebar.Category>
              <Sidebar.Item id="todos" link={<Link to="/todos" />}>
                <Sidebar.ItemIcon>
                  <ListChecks size={18} />
                </Sidebar.ItemIcon>
                <Sidebar.ItemLabel>My Todos</Sidebar.ItemLabel>
              </Sidebar.Item>
            </Sidebar.Category>
          </Sidebar.Nav>
        </Sidebar>
      </OxygenAppShell.Sidebar>

      <OxygenAppShell.Main>
        <Outlet />
      </OxygenAppShell.Main>

      <OxygenAppShell.Footer>
        <Footer>
          <Footer.Copyright>© WSO2 LLC</Footer.Copyright>
        </Footer>
      </OxygenAppShell.Footer>
    </OxygenAppShell>
  );
}
