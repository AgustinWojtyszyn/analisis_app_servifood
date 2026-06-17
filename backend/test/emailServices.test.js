import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CERTIFICATION_TEST_EMAIL_RECIPIENT,
  __resetCertificationEmailServiceForTests,
  __setCertificationEmailTransportFactoryForTests,
  sendCertificationExpirationPilotEmail,
  sendCertificationExpirationTestEmail
} from '../src/services/email/emailService.js';
import {
  FIXED_RECIPIENTS,
  __resetNutritionModulesEmailServiceForTests,
  __setNutritionModulesEmailTransportFactoryForTests,
  sendDocumentCreatedEmailNotification
} from '../src/services/nutritionModulesNotifications.js';

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  process.env.SMTP_HOST = 'smtp.resend.com';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_USER = 'resend';
  process.env.SMTP_PASS = 'test-secret';
  process.env.SMTP_FROM = 'soporte@servifoodapp.site';
  process.env.SMTP_SECURE = 'false';
  process.env.FRONTEND_URL = 'https://analisis.servifoodapp.site';
  delete process.env.CERTIFICATION_NOTIFICATION_RECIPIENTS;
}

function buildCertification() {
  return {
    id: 'cert-1',
    name: 'BPM',
    module: 'Calidad',
    type: 'Certificado',
    expiration_date: '2026-07-01'
  };
}

function buildTriggerInfo() {
  return {
    daysUntilExpiration: 7,
    triggerType: 'seven_days',
    humanTriggerLabel: 'Vence en 7 días'
  };
}

function buildNotification(overrides = {}) {
  return {
    title: 'Manual de buenas prácticas',
    module_type: 'procedimiento',
    document_created_at: '2026-06-17T12:00:00.000Z',
    recipients: JSON.stringify(FIXED_RECIPIENTS),
    ...overrides
  };
}

test.beforeEach(() => {
  resetEnv();
  __resetCertificationEmailServiceForTests();
  __resetNutritionModulesEmailServiceForTests();
});

test.afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  __resetCertificationEmailServiceForTests();
  __resetNutritionModulesEmailServiceForTests();
});

test('certificaciones crea transporte SMTP y envía HTML/texto sin SMTP real', async () => {
  const createdWith = [];
  const sentMessages = [];
  __setCertificationEmailTransportFactoryForTests((options) => {
    createdWith.push(options);
    return {
      sendMail: async (message) => {
        sentMessages.push(message);
        return {
          messageId: 'mock-cert-1',
          accepted: [message.to],
          rejected: []
        };
      }
    };
  });

  const result = await sendCertificationExpirationTestEmail({
    certification: buildCertification(),
    triggerInfo: buildTriggerInfo(),
    to: CERTIFICATION_TEST_EMAIL_RECIPIENT
  });

  assert.deepEqual(createdWith, [{
    host: 'smtp.resend.com',
    port: 587,
    secure: false,
    auth: { user: 'resend', pass: 'test-secret' }
  }]);
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].from, 'soporte@servifoodapp.site');
  assert.equal(sentMessages[0].to, CERTIFICATION_TEST_EMAIL_RECIPIENT);
  assert.match(sentMessages[0].subject, /Certificación próxima a vencer/);
  assert.match(sentMessages[0].text, /BPM/);
  assert.match(sentMessages[0].html, /BPM/);
  assert.equal(sentMessages[0].attachments, undefined);
  assert.deepEqual(result, {
    provider: 'smtp-nodemailer',
    messageId: 'mock-cert-1',
    accepted: [CERTIFICATION_TEST_EMAIL_RECIPIENT],
    rejected: []
  });
});

test('certificaciones propaga error SMTP sin reintentar ni enviar por red', async () => {
  let attempts = 0;
  __setCertificationEmailTransportFactoryForTests(() => ({
    sendMail: async () => {
      attempts += 1;
      throw new Error('smtp rejected');
    }
  }));

  await assert.rejects(
    () => sendCertificationExpirationPilotEmail({
      certification: buildCertification(),
      triggerInfo: buildTriggerInfo(),
      to: CERTIFICATION_TEST_EMAIL_RECIPIENT
    }),
    /smtp rejected/
  );
  assert.equal(attempts, 1);
});

test('certificaciones mantiene whitelist de destinatarios autorizados', async () => {
  let created = false;
  __setCertificationEmailTransportFactoryForTests(() => {
    created = true;
    return { sendMail: async () => ({ messageId: 'unexpected' }) };
  });

  await assert.rejects(
    () => sendCertificationExpirationTestEmail({
      certification: buildCertification(),
      triggerInfo: buildTriggerInfo(),
      to: 'externo@example.com'
    }),
    /Destinatario no permitido/
  );
  assert.equal(created, false);
});

test('documentos SGC verifica transporte, envía múltiples destinatarios y conserva HTML/texto', async () => {
  const createdWith = [];
  const calls = { verify: 0, send: [] };
  __setNutritionModulesEmailTransportFactoryForTests((options) => {
    createdWith.push(options);
    return {
      verify: async () => {
        calls.verify += 1;
        return true;
      },
      sendMail: async (message) => {
        calls.send.push(message);
        return {
          messageId: 'mock-sgc-1',
          accepted: [...FIXED_RECIPIENTS],
          rejected: [],
          response: '250 ok',
          envelope: { to: [...FIXED_RECIPIENTS] }
        };
      }
    };
  });

  const result = await sendDocumentCreatedEmailNotification(buildNotification());

  assert.deepEqual(createdWith, [{
    host: 'smtp.resend.com',
    port: 587,
    secure: false,
    auth: { user: 'resend', pass: 'test-secret' }
  }]);
  assert.equal(calls.verify, 1);
  assert.equal(calls.send.length, 1);
  assert.equal(calls.send[0].from, 'soporte@servifoodapp.site');
  assert.equal(calls.send[0].to, FIXED_RECIPIENTS.join(','));
  assert.match(calls.send[0].subject, /Nuevo documento/);
  assert.match(calls.send[0].text, /Manual de buenas prácticas/);
  assert.match(calls.send[0].html, /Manual de buenas prácticas/);
  assert.equal(calls.send[0].attachments, undefined);
  assert.equal(result.provider, 'smtp-nodemailer');
  assert.equal(result.providerMessageId, 'mock-sgc-1');
  assert.equal(result.acceptedCount, FIXED_RECIPIENTS.length);
});

test('documentos SGC rechaza destinatarios fuera de la whitelist antes de enviar', async () => {
  let sendAttempts = 0;
  __setNutritionModulesEmailTransportFactoryForTests(() => ({
    verify: async () => true,
    sendMail: async () => {
      sendAttempts += 1;
      return { messageId: 'unexpected' };
    }
  }));

  await assert.rejects(
    () => sendDocumentCreatedEmailNotification(buildNotification({
      recipients: JSON.stringify(['externo@example.com'])
    })),
    /Lista de destinatarios inválida/
  );
  assert.equal(sendAttempts, 0);
});

test('documentos SGC propaga error de verify SMTP sin sendMail', async () => {
  let sendAttempts = 0;
  __setNutritionModulesEmailTransportFactoryForTests(() => ({
    verify: async () => {
      throw new Error('verify failed');
    },
    sendMail: async () => {
      sendAttempts += 1;
      return { messageId: 'unexpected' };
    }
  }));

  await assert.rejects(
    () => sendDocumentCreatedEmailNotification(buildNotification()),
    /verify failed/
  );
  assert.equal(sendAttempts, 0);
});
