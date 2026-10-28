-- Datos base de catálogos. Los pesos del KRI NO se siembran: el modelo de scoring
-- está pendiente de definir (docs/scoring-model.md).

insert into public.risk_domains (key, name, description) values
  ('exposure',      'Exposición de servicios',  'Servicios y puertos visibles públicamente, según fuentes pasivas.'),
  ('email',         'Seguridad de correo',      'SPF, DKIM, DMARC y configuración MX publicada en DNS.'),
  ('certs',         'Certificados',             'Certificados TLS observados en logs de Certificate Transparency.'),
  ('secrets',       'Secretos filtrados',       'Credenciales o llaves expuestas en repositorios públicos.'),
  ('reputation',    'Reputación',               'Presencia de activos en listas de malware, phishing o botnets.'),
  ('impersonation', 'Suplantación',             'Dominios parecidos (typosquatting) registrados por terceros.');

-- Todas las fuentes arrancan deshabilitadas; un admin las habilita tras revisarlas.
-- Licencias en null están pendientes de verificar (docs/sources.md).
insert into public.sources (source_key, name, risk_domain_id, is_no_contact, license) values
  ('spiderfoot', 'SpiderFoot (módulos pasivos)', (select id from public.risk_domains where key = 'exposure'),      true,  'MIT'),
  -- InternetDB es gratuito solo para uso no comercial (docs/sources.md).
  ('internetdb', 'Shodan InternetDB',          (select id from public.risk_domains where key = 'exposure'),      true,  'Gratuito, uso no comercial'),
  ('crtsh',      'crt.sh',                       (select id from public.risk_domains where key = 'certs'),         true,  null),
  -- Lee SPF/DMARC/MX publicados vía dns.google (DoH); no contacta servidores de la empresa.
  ('email_dns',  'DNS público (correo)',         (select id from public.risk_domains where key = 'email'),         true,  'Registros DNS públicos'),
  ('checkdmarc', 'checkdmarc',                   (select id from public.risk_domains where key = 'email'),         true,  'Apache-2.0'),
  -- Clona repos públicos de github.com (organizaciones code_org confirmadas); no la infraestructura.
  ('gitleaks',   'Gitleaks',                     (select id from public.risk_domains where key = 'secrets'),       true,  'MIT'),
  -- URLhaus, ThreatFox y Feodo Tracker: API Community gratuita bajo uso justo (docs/sources.md).
  ('abusech',    'abuse.ch',                     (select id from public.risk_domains where key = 'reputation'),    true,  'API Community, uso justo'),
  -- Técnicas de dnstwist implementadas en Warden; solo consulta dns.google (DoH).
  ('typosquat',  'Dominios parecidos (DNS)',     (select id from public.risk_domains where key = 'impersonation'), true,  'Implementación propia'),
  -- Shodan es un servicio comercial, no open source: queda registrado pero bloqueado hasta decidirlo.
  ('shodan',     'Shodan',                       (select id from public.risk_domains where key = 'exposure'),      true,  'proprietary');

-- Solo el nombre de la variable de entorno del worker, nunca la llave.
insert into public.source_credentials (source_key, secret_ref) values
  ('abusech', 'ABUSECH_AUTH_KEY');
