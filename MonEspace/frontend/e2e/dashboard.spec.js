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

    await page.getByRole("button", { name: "Mode sombre" }).click();
    await expect(page.locator(".dashboard-shell")).toHaveClass(/dashboard-shell--dark/);
    expect(widgets.map((widget) => widget.type)).toEqual(["planning", "timer"]);
});

test("Post-it formatting persists after reload", async ({ page }) => {
    test.skip(
        !process.env.VITE_TINYMCE_API_KEY,
        "Set VITE_TINYMCE_API_KEY to run the TinyMCE Cloud editing test."
    );

    const { widgets, patches } = await mockDashboard(page);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "+ Ajouter un widget" }).click();
    await page.getByRole("menuitem", { name: "Post-it" }).click();
    const editor = page.frameLocator("iframe.tox-edit-area__iframe").locator("body#tinymce");
    await editor.waitFor();
    await editor.fill("Note formatée");
    await editor.press("Control+A");
    await page.locator('button[title="Bold"]').click();
    await page.locator('button[title="Font size"]').click();
    await page.getByRole("menuitem", { name: "24px" }).click();
    await page.locator('button[title="Font family"]').click();
    await page.getByRole("menuitem", { name: "Georgia" }).click();

    await expect.poll(() => patches.some((patch) => patch.content?.includes("Note formatée"))).toBe(true);
    const widget = widgets.find((item) => item.type === "postit");
    expect(widget.data.content).toContain("<strong>");

    await page.reload();
    const restoredEditor = page.frameLocator("iframe.tox-edit-area__iframe").locator("body#tinymce");
    await expect(restoredEditor).toContainText("Note formatée");
    await expect(restoredEditor.locator("strong")).toHaveCount(1);
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

test("calendar creates a planning widget and supports event CRUD", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-11-02T10:00:00") });
    await page.addInitScript(() => localStorage.setItem("token", "calendar-e2e-token"));
    await page.route("**/api/auth/me", (route) =>
        route.fulfill({ status: 200, json: { userId: 7 } })
    );
    await page.route("**/api/boards", (route) =>
        route.fulfill({
            status: 200,
            json: { board: { board_id: 3, name: "Espace test" }, widgets: [] },
        })
    );

    let planningWidgetCreated = false;
    let createdEvent;
    let updatedEvent;
    let deletedEventId;
    await page.route("**/api/widgets", async (route) => {
        const body = route.request().postDataJSON();
        planningWidgetCreated = body.type === "planning";
        await route.fulfill({
            status: 201,
            json: {
                widget: {
                    widget_id: 9,
                    type: "planning",
                    pos_x: 24,
                    pos_y: 24,
                    width: 380,
                    height: 420,
                    data: [],
                },
            },
        });
    });
    await page.route("**/api/widgets/9/events", async (route) => {
        if (route.request().method() === "POST") {
            createdEvent = { eventId: 81, ...route.request().postDataJSON() };
            await route.fulfill({ status: 201, json: { event: createdEvent } });
            return;
        }
        await route.continue();
    });
    await page.route("**/api/widgets/9/events/81", async (route) => {
        if (route.request().method() === "PATCH") {
            updatedEvent = { eventId: 81, ...route.request().postDataJSON() };
            await route.fulfill({ status: 200, json: { event: updatedEvent } });
            return;
        }
        if (route.request().method() === "DELETE") {
            deletedEventId = 81;
            await route.fulfill({ status: 200, json: { message: "Événement supprimé." } });
            return;
        }
        await route.continue();
    });

    await page.goto("/calendar");
    await expect(page.getByRole("heading", { name: "Calendrier" })).toBeVisible();
    await expect(page.locator(".fc-today-button")).toBeVisible();
    await page.locator('.fc-daygrid-day[data-date="2026-11-15"]').click({
        position: { x: 30, y: 30 },
    });
    expect(planningWidgetCreated).toBe(true);

    await page.getByLabel("Titre").fill("Rendez-vous");
    await page.getByRole("button", { name: "Ajouter l’événement" }).click();
    await expect(page.locator(".fc-event")).toContainText("Rendez-vous");
    expect(createdEvent.title).toBe("Rendez-vous");

    await page.locator(".fc-event").click();
    await page.getByRole("button", { name: "Modifier" }).click();
    await page.getByLabel("Titre").fill("Rendez-vous modifié");
    await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
    await expect(
        page.locator(".fc-event").filter({ hasText: "Rendez-vous modifié" })
    ).toBeVisible();
    expect(updatedEvent.title).toBe("Rendez-vous modifié");

    await page.locator(".fc-event").click();
    await page.getByRole("button", { name: "Supprimer" }).click();
    await expect(
        page.locator(".fc-event").filter({ hasText: "Rendez-vous modifié" })
    ).toHaveCount(0);
    expect(deletedEventId).toBe(81);
});

test("dashboard opens the calendar and creates an event on a selected date", async ({ page }) => {
    const planningWidget = {
        widget_id: 9,
        type: "planning",
        pos_x: 24,
        pos_y: 24,
        width: 380,
        height: 420,
        data: [{
            eventId: 31,
            title: "Réunion",
            startDate: "2026-11-06T09:00:00.000Z",
            endDate: null,
            description: "Point hebdomadaire",
        }],
    };
    let createdEvent;
    await page.addInitScript(() => localStorage.setItem("token", "calendar-e2e-token"));
    await page.route("**/api/auth/me", (route) =>
        route.fulfill({ status: 200, json: { userId: 7 } })
    );
    await page.route("**/api/boards", (route) =>
        route.fulfill({
            status: 200,
            json: {
                board: { board_id: 3, name: "Espace test" },
                widgets: [planningWidget],
            },
        })
    );
    await page.route("**/api/widgets/9/events", async (route) => {
        if (route.request().method() === "POST") {
            const body = route.request().postDataJSON();
            createdEvent = { eventId: 32, ...body };
            planningWidget.data.push(createdEvent);
            await route.fulfill({ status: 201, json: { event: createdEvent } });
            return;
        }

        await route.fulfill({ status: 200, json: { events: planningWidget.data } });
    });
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Calendrier" }).click();
    await page.getByRole("heading", { name: "Calendrier" }).waitFor();
    await expect(page.locator(".fc-event")).toContainText("Réunion");

    await page.locator('.fc-daygrid-day[data-date="2026-11-15"]').click({
        position: { x: 40, y: 30 },
    });
    await page.getByLabel("Titre").fill("Événement depuis le calendrier");
    await page.getByRole("button", { name: "Ajouter l’événement" }).click();

    await expect(
        page.locator(".fc-event").filter({ hasText: "Événement depuis le calendrier" })
    ).toBeVisible();
    expect(createdEvent.title).toBe("Événement depuis le calendrier");
});
