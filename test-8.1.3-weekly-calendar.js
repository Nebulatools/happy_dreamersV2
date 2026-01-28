const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1024 } });
  const page = await context.newPage();

  try {
    console.log('RALPH_TEST_START: [8.1.3] - Test Calendario Vista Semanal (Desktop)');

    console.log('RALPH_TEST_CHECKPOINT: Navegando directamente a /auth/login');
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    console.log('RALPH_TEST_CHECKPOINT: Esperando formulario de login...');
    await page.waitForLoadState('networkidle');

    // Buscar input de email
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

    // Navegar a calendario
    console.log('RALPH_TEST_CHECKPOINT: Navegando a /dashboard/calendar');
    await page.goto('http://localhost:3000/dashboard/calendar', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    // Verificar que estamos en vista diaria por defecto
    console.log('RALPH_TEST_CHECKPOINT: Verificando tab Diario activo...');
    const diarioCount = await page.locator('text="Diario"').count();
    console.log(`  - Tab Diario encontrado: ${diarioCount > 0 ? 'SI' : 'NO'}`);

    // Click en tab Semanal
    console.log('RALPH_TEST_CHECKPOINT: Haciendo click en tab Semanal...');
    const semanalTab = page.locator('text="Semanal"');
    await semanalTab.click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');

    console.log('RALPH_TEST_CHECKPOINT: Verificando vista semanal cargada...');

    // Verificaciones
    // 1. Tab Semanal está activo
    const semanalCount = await page.locator('text="Semanal"').count();
    console.log(`  - Tab Semanal encontrado: ${semanalCount > 0 ? 'SI' : 'NO'}`);

    // 2. Verificar que NO hay toggle Gráfico/Calendario (debe estar oculto para padres)
    const toggleCount = await page.locator('text="Gráfico"').count();
    console.log(`  - Toggle Gráfico visible: ${toggleCount > 0 ? 'SI (ERROR)' : 'NO (OK)'}`);

    // 3. Verificar que NO hay scroll interno forzado
    console.log('RALPH_TEST_CHECKPOINT: Verificando ausencia de scroll interno...');
    const calendarContainer = page.locator('[class*="calendar"]').first();
    const hasOverflowScroll = await calendarContainer.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.overflowY === 'scroll' || style.overflowY === 'auto';
    }).catch(() => false);
    console.log(`  - Contenedor tiene overflow scroll: ${hasOverflowScroll ? 'SI (revisar)' : 'NO (OK)'}`);

    // 4. Verificar que hay datos de la semana visibles (contenido del calendario)
    console.log('RALPH_TEST_CHECKPOINT: Verificando contenido de la semana visible...');

    // Buscar elementos que indiquen días de la semana
    const dayLabels = await page.locator('text=/^(Lun|Mar|Mié|Jue|Vie|Sáb|Dom)/').count();
    console.log(`  - Etiquetas de días encontradas: ${dayLabels}`);

    // Buscar iconos de eventos (usando lucide icons)
    const eventIcons = await page.locator('svg[class*="lucide"]').count();
    console.log(`  - Iconos de eventos encontrados: ${eventIcons}`);

    // 5. Verificar que el calendario no tiene altura fija que cause scroll
    console.log('RALPH_TEST_CHECKPOINT: Verificando layout sin altura fija...');
    const calendarHeight = await page.evaluate(() => {
      const calendar = document.querySelector('[class*="calendar"]');
      if (calendar) {
        const style = window.getComputedStyle(calendar);
        return {
          height: style.height,
          maxHeight: style.maxHeight,
          overflow: style.overflow,
          overflowY: style.overflowY
        };
      }
      return null;
    });
    console.log('  - Estilos del calendario:', JSON.stringify(calendarHeight, null, 2));

    // Tomar screenshot
    console.log('RALPH_TEST_CHECKPOINT: Tomando screenshot...');
    await page.screenshot({
      path: 'test-screenshots/8.1.3-desktop-calendar-weekly.png',
      fullPage: true
    });
    console.log('RALPH_TEST_SCREENSHOT: test-screenshots/8.1.3-desktop-calendar-weekly.png - Vista semanal completa');

    // Evaluación de resultados
    console.log('\n=== EVALUACIÓN DE RESULTADOS ===');
    console.log(`✓ Tab Semanal: ${semanalCount > 0 ? 'PRESENTE' : 'NO ENCONTRADO'}`);
    console.log(`✓ Toggle Gráfico (debe estar oculto): ${toggleCount === 0 ? 'OCULTO (OK)' : 'VISIBLE (ERROR)'}`);
    console.log(`✓ Scroll interno forzado: ${hasOverflowScroll ? 'PRESENTE (revisar)' : 'AUSENTE (OK)'}`);
    console.log(`✓ Etiquetas de días: ${dayLabels > 0 ? dayLabels + ' (OK)' : 'NO ENCONTRADAS'}`);
    console.log(`✓ Iconos de eventos: ${eventIcons > 0 ? eventIcons + ' (OK)' : 'NO ENCONTRADOS'}`);

    // Determinar si el test pasó
    const testPassed = semanalCount > 0 && toggleCount === 0 && !hasOverflowScroll;

    if (testPassed) {
      console.log('\nRAPH_TEST_PASS: [8.1.3] - Todos los checkpoints principales verificados OK');
    } else {
      console.log('\nRAPH_TEST_FAIL: [8.1.3] - Algunos checkpoints fallaron');
      if (semanalCount === 0) console.log('  - FALLO: Tab Semanal no encontrado');
      if (toggleCount > 0) console.log('  - FALLO: Toggle Gráfico visible para padre (debe estar oculto)');
      if (hasOverflowScroll) console.log('  - ADVERTENCIA: Contenedor tiene scroll interno');
    }

    // Mantener browser abierto 60s para inspección manual
    console.log('\nRalph mantiene browser abierto 60s para inspección manual...');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('RALPH_BUG_DETECTED:', error);
    await page.screenshot({
      path: 'test-screenshots/8.1.3-error.png',
      fullPage: true
    });
  } finally {
    await browser.close();
    console.log('RALPH_TEST_COMPLETE: Test [8.1.3] finalizado');
  }
})();
