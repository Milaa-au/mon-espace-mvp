import { expect, test } from "@playwright/test";

async function mockDashboard(page) {
    const widgets = [];
    const patches = [];
    let nextId = 40;

    await page.addInitScript(() => localStorage.setItem("token", "dashboard-e2e-token"));
    await page.route("**/api/auth/me", (route) =>
        route.fulfill({ status: 200, json: { userId: 7 } })
    );
    await page.route("**/api/boards", (route) =>
        route.fulfill({
            status: 200,
            json: { board: { board_id: 3, name: "Espace test" }, widgets },
        })
    );
    await page.route("**/api/widgets", async (route) => {
        if (route.request().method() !== "POST") {
            await route.continue();
            return;
        }

        const body = route.request().postDataJSON();
        const widget = {
            widget_id: nextId++,
            type: body.type,
            pos_x: body.posX,
            pos_y: body.posY,
            width: body.width,
            height: body.height,
            data: body.type === "postit"
                ? { content: "" }
                : body.type === "timer"
                    ? {
                        label: "Timer",
                        durationSeconds: 1500,
                        remainingSeconds: 1500,
                        status: "idle",
                        startedAt: null,
                    }
                    : [],
        };
        widgets.push(widget);
        await route.fulfill({ status: 201, json: { widget } });
    });
    await page.route("**/api/widgets/*/timer**", (route) =>
        route.fulfill({
            status: 200,
            json: {
                timer: {
                    label: "Timer",
                    durationSeconds: 1500,
                    remainingSeconds: 1500,
                    status: "idle",
                    startedAt: null,
                },
            },
        })
    );
    await page.route("**/api/widgets/*", async (route) => {
        if (route.request().method() !== "PATCH") {
            await route.continue();
            return;
        }

        const body = route.request().postDataJSON();
        patches.push(body);
        const widgetId = Number(new URL(route.request().url()).pathname.split("/").at(-1));
        const widget = widgets.find((item) => item.widget_id === widgetId);
        if (widget) {
            if (body.content !== undefined) widget.data.content = body.content;
            if (body.posX !== undefined) widget.pos_x = body.posX;
            if (body.posY !== undefined) widget.pos_y = body.posY;
            if (body.width !== undefined) widget.width = body.width;
            if (body.height !== undefined) widget.height = body.height;
        }
        await route.fulfill({ status: 200, json: { widget } });
    });

    return { widgets, patches };
}

test("launcher creates planning and timer widgets and theme mode is selectable", async ({ page }) => {
    const { widgets } = await mockDashboard(page);
    await page.goto("/dashboard");

    await page.getByRole("button", { name: "+ Ajouter un widget" }).click();
    await page.getByRole("menuitem", { name: "Planning" }).click();
    await expect(page.locator(".widget-container--planning")).toHaveCount(1);

    await page.getByRole("button", { name: "+ Ajouter un widget" }).click();
    await page.getByRole("menuitem", { name: "Timer" }).click();
    await expect(page.locator(".widget-container--timer")).toHaveCount(1);

    await page.getByRole("button", { name: "Sombre" }).click();
    await expect(page.locator(".dashboard-shell")).toHaveClass(/dashboard-shell--dark/);
    expect(widgets.map((widget) => widget.type)).toEqual(["planning", "timer"]);
});

test("Post-it formatting persists after reload", async ({ page }) => {
    const { widgets, patches } = await mockDashboard(page);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "+ Ajouter un widget" }).click();
    await page.getByRole("menuitem", { name: "Post-it" }).click();

    const editor = page.locator(".tiptap[contenteditable='true']");
    await editor.waitFor();
    await editor.fill("Note formatée");
    await editor.press("Control+A");
    await page.getByRole("button", { name: "Gras" }).click();
    await page.getByLabel("Taille du texte").selectOption("24px");
    await page.getByLabel("Police").selectOption("Georgia");

    await expect.poll(() => patches.some((patch) => patch.content?.includes("Note formatée"))).toBe(true);
    const widget = widgets.find((item) => item.type === "postit");
    expect(widget.data.content).toContain("<strong>");

    await page.reload();
    await expect(page.locator(".tiptap[contenteditable='true']")).toContainText("Note formatée");
    await expect(page.locator(".tiptap strong")).toHaveCount(1);
});

test("drag and resize persist widget layout", async ({ page }) => {
    const { widgets, patches } = await mockDashboard(page);
    widgets.push({
        widget_id: 21,
        type: "postit",
        pos_x: 24,
        pos_y: 24,
        width: 320,
        height: 240,
        data: { content: "Déplace-moi" },
    });
    await page.goto("/dashboard");

    const dragHandle = page.getByRole("button", { name: "Déplacer Mon Post-it" });
    const dragBox = await dragHandle.boundingBox();
    await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(dragBox.x + dragBox.width / 2 + 80, dragBox.y + dragBox.height / 2 + 50, { steps: 6 });
    await page.mouse.up();
    await expect.poll(() => patches.some((patch) => patch.posX > 24 && patch.posY > 24)).toBe(true);

    const resizeHandle = page.getByRole("button", { name: "Redimensionner Mon Post-it" });
    const resizeBox = await resizeHandle.boundingBox();
    await page.mouse.move(resizeBox.x + resizeBox.width / 2, resizeBox.y + resizeBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(resizeBox.x + resizeBox.width / 2 + 60, resizeBox.y + resizeBox.height / 2 + 40, { steps: 6 });
    await page.mouse.up();
    await expect.poll(() => patches.some((patch) => patch.width > 320 && patch.height > 240)).toBe(true);
});
