const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1024 } });
  const page = await context.newPage();

  try {
    console.log('RALPH_TEST_CHECKPOINT: Navegando directamente a /auth/login');
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    console.log('RALPH_TEST_CHECKPOINT: Esperando formulario de login...');
    // Esperar a que la página cargue completamente
    await page.waitForLoadState('networkidle');

    // Buscar input de email con múltiples estrategias
    console.log('RALPH_TEST_CHECKPOINT: Buscando campo de email...');
    const emailVisible = await page.locator('input[type="email"]').isVisible().catch(() => false);
    console.log('  - Email input visible: ' + emailVisible);

    if (emailVisible) {
      console.log('RALPH_TEST_CHECKPOINT: Login como padre eljulius@nebulastudios.io');
      await page.fill('input[type="email"]', 'eljulius@nebulastudios.io');
      await page.fill('input[type="password"]', 'juls0925');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(4000);
    } else {
      console.log('RALPH_TEST_CHECKPOINT: Formulario no encontrado, verificando si ya estamos logueados...');
    }

    console.log('RALPH_TEST_CHECKPOINT: Navegando a /dashboard/calendar');
    await page.goto('http://localhost:3000/dashboard/calendar', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    console.log('RALPH_TEST_CHECKPOINT: Verificando tabs visibles (solo Diario + Semanal para padres)');
    const diarioTab = await page.locator('text="Diario"').count();
    const semanalTab = await page.locator('text="Semanal"').count();
    const mensualTab = await page.locator('text="Mensual"').count();

    console.log('  - Tab Diario: ' + (diarioTab > 0 ? 'SI' : 'NO'));
    console.log('  - Tab Semanal: ' + (semanalTab > 0 ? 'SI' : 'NO'));
    console.log('  - Tab Mensual (NO debe aparecer): ' + (mensualTab === 0 ? 'OK' : 'FAIL'));

    console.log('RALPH_TEST_CHECKPOINT: Verificando toggle Gráfico/Calendario');
    // Buscar el toggle que alterna entre Calendario y Gráfico
    const graficoButton = await page.locator('button:has-text("Gráfico")').count();
    const calendarioButton = await page.locator('button:has-text("Calendario")').count();
    const hasToggle = graficoButton > 0 || calendarioButton > 0;
    console.log('  - Toggle Gráfico/Calendario (NO debe aparecer): ' + (hasToggle ? 'FAIL - está presente' : 'OK'));

    console.log('RALPH_TEST_CHECKPOINT: Verificando card Plan vs Eventos arriba del calendario');
    const planCard = await page.locator('text="Plan"').count();
    const eventosCard = await page.locator('text="Eventos"').count();
    console.log('  - Card con texto "Plan": ' + (planCard > 0 ? 'SI' : 'NO'));
    console.log('  - Card con texto "Eventos": ' + (eventosCard > 0 ? 'SI' : 'NO'));

    console.log('RALPH_TEST_CHECKPOINT: Verificando calendario sin scroll interno');
    // Simplificado: verificar que no hay overflow visible
    const bodyOverflow = await page.evaluate(() => {
      const containers = document.querySelectorAll('[class*="calendar"], [class*="Calendar"]');
      for (const el of containers) {
        const style = window.getComputedStyle(el);
        if (style.overflow === 'scroll' || style.overflowY === 'scroll') {
          return true;
        }
      }
      return false;
    });
    console.log('  - Sin scroll interno forzado: ' + (!bodyOverflow ? 'OK' : 'FAIL'));

    console.log('RALPH_TEST_CHECKPOINT: Verificando eventos con iconos correctos');
    const hasIcons = await page.locator('svg').count();
    console.log('  - Iconos SVG visibles: ' + (hasIcons > 0 ? 'SI (' + hasIcons + ' iconos)' : 'NO'));

    console.log('RALPH_TEST_CHECKPOINT: Tomando screenshot fullPage');
    await page.screenshot({ path: 'test-screenshots/8.1.2-desktop-calendar-daily.png', fullPage: true });

    console.log('RALPH_TEST_SCREENSHOT: test-screenshots/8.1.2-desktop-calendar-daily.png - Calendario vista diaria Desktop 1280px');

    const allCriticalPassed = diarioTab > 0 && semanalTab > 0 && mensualTab === 0 && !hasToggle;

    if (allCriticalPassed) {
      console.log('\n=== RALPH_TEST_PASS: [8.1.2] ===');
      console.log('Checkpoints CRÍTICOS verificados OK:');
      console.log('  - Tab Diario: SI');
      console.log('  - Tab Semanal: SI');
      console.log('  - Tab Mensual: NO (correcto para padre)');
      console.log('  - Toggle Gráfico/Calendario: NO (correcto para padre)');
      console.log('  - Screenshot: test-screenshots/8.1.2-desktop-calendar-daily.png');

      if (planCard > 0 || eventosCard > 0) {
        console.log('  - Card Plan vs Eventos: PRESENTE');
      }
    } else {
      console.log('\n=== RALPH_TEST_FAIL: [8.1.2] ===');
      console.log('RALPH_BUG_FOUND: Configuración incorrecta para rol padre');
      if (diarioTab === 0) console.log('  - ERROR: Tab Diario NO visible');
      if (semanalTab === 0) console.log('  - ERROR: Tab Semanal NO visible');
      if (mensualTab > 0) console.log('  - ERROR: Tab Mensual visible (debe estar oculto)');
      if (hasToggle) console.log('  - ERROR: Toggle Gráfico/Calendario visible (debe estar oculto)');
    }

    console.log('\nManteniendo browser abierto para inspección manual (60s)...');
    console.log('Puedes verificar visualmente el calendario antes de que se cierre.');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('\nERROR en test:', error.message);
    console.log('RALPH_BUG_FOUND: ' + error.message);
    await page.screenshot({ path: 'test-screenshots/8.1.2-error.png' });
  } finally {
    await browser.close();
  }
})();
