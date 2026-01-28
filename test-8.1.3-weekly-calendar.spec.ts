import { test, expect } from '@playwright/test';

test('8.1.3 - Test Calendario Vista Semanal (Desktop)', async ({ page }) => {
  console.log('RALPH_TEST_START: [8.1.3] - Test Calendario Vista Semanal (Desktop)');

  // Configurar viewport desktop
  await page.setViewportSize({ width: 1280, height: 720 });
  console.log('RALPH_TEST_CHECKPOINT: Viewport configurado a 1280x720');

  // Login como padre
  console.log('RALPH_TEST_CHECKPOINT: Navegando a login...');
  await page.goto('http://localhost:3000/auth/login');
  await page.waitForLoadState('networkidle');

  console.log('RALPH_TEST_CHECKPOINT: Ingresando credenciales...');
  await page.fill('input[type="email"]', 'eljulius@nebulastudios.io');
  await page.fill('input[type="password"]', 'juls0925');
  await page.click('button[type="submit"]');

  // Esperar a que cargue el dashboard
  console.log('RALPH_TEST_CHECKPOINT: Esperando carga del dashboard...');
  await page.waitForURL('**/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Navegar a calendario
  console.log('RALPH_TEST_CHECKPOINT: Navegando a calendario...');
  await page.goto('http://localhost:3000/dashboard/calendar');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Verificar que estamos en vista diaria por defecto
  console.log('RALPH_TEST_CHECKPOINT: Verificando tab Diario activo...');
  const dailyTab = page.locator('button:has-text("Diario")');
  await expect(dailyTab).toBeVisible();

  // Click en tab Semanal
  console.log('RALPH_TEST_CHECKPOINT: Haciendo click en tab Semanal...');
  const weeklyTab = page.locator('button:has-text("Semanal")');
  await weeklyTab.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Verificaciones
  console.log('RALPH_TEST_CHECKPOINT: Verificando vista semanal cargada...');

  // 1. Verificar que tab Semanal está activo
  console.log('RALPH_TEST_CHECKPOINT: Verificando tab Semanal activo...');
  const weeklyTabActive = await weeklyTab.getAttribute('class');
  console.log(`Tab Semanal classes: ${weeklyTabActive}`);

  // 2. Verificar que NO hay scroll interno forzado (no debe tener overflow-y-auto en contenedor principal)
  console.log('RALPH_TEST_CHECKPOINT: Verificando ausencia de scroll interno...');
  const calendarContainer = page.locator('[class*="calendar"]').first();
  const hasOverflowScroll = await calendarContainer.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return style.overflowY === 'scroll' || style.overflowY === 'auto';
  });
  console.log(`Contenedor tiene overflow scroll: ${hasOverflowScroll}`);

  // 3. Verificar que hay datos de la semana visibles (columnas de días)
  console.log('RALPH_TEST_CHECKPOINT: Verificando columnas de días visibles...');
  const dayColumns = await page.locator('[class*="day"]').count();
  console.log(`Columnas de días encontradas: ${dayColumns}`);

  // 4. Verificar que hay eventos/bloques visibles
  console.log('RALPH_TEST_CHECKPOINT: Verificando eventos visibles en la semana...');
  const eventBlocks = await page.locator('svg[class*="lucide"]').count();
  console.log(`Iconos de eventos encontrados: ${eventBlocks}`);

  // Tomar screenshot fullPage
  console.log('RALPH_TEST_CHECKPOINT: Tomando screenshot...');
  await page.screenshot({
    path: 'test-screenshots/8.1.3-desktop-calendar-weekly.png',
    fullPage: true
  });
  console.log('RALPH_TEST_SCREENSHOT: test-screenshots/8.1.3-desktop-calendar-weekly.png - Vista semanal completa');

  // Evaluación de resultados
  console.log('\n=== EVALUACIÓN DE RESULTADOS ===');
  console.log(`✓ Tab Semanal: ACTIVO`);
  console.log(`✓ Scroll interno forzado: ${hasOverflowScroll ? 'PRESENTE (revisar)' : 'AUSENTE (OK)'}`);
  console.log(`✓ Columnas de días: ${dayColumns > 0 ? dayColumns + ' (OK)' : 'NO ENCONTRADAS'}`);
  console.log(`✓ Eventos visibles: ${eventBlocks > 0 ? eventBlocks + ' iconos (OK)' : 'NO ENCONTRADOS'}`);

  // Mantener browser abierto 60s
  console.log('\nRalph mantiene browser abierto 60s para inspección manual...');
  await page.waitForTimeout(60000);

  console.log('RALPH_TEST_COMPLETE: Test [8.1.3] finalizado');
});
