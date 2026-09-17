
// i18n.js – zentrales Sprachmodul für Mahjong-Treff (Cookie-Handling, i18next-Setup, Sprachauswahl-UI)

function getCookie(name) {
    const match = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return match ? match.pop() : null;
}

function setLanguageCookie(lang) {
    document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

function setActiveFlag(lang) {
    document.querySelectorAll('.lang-flag').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerHTML = i18next.t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.setAttribute('placeholder', i18next.t(key));
    });
}

document.querySelectorAll('.lang-flag').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const lang = btn.dataset.lang;
        setLanguageCookie(lang);
        window.location.reload();
    });
});

setActiveFlag(getCookie('lang') || 'de');

i18next
    .use(i18nextHttpBackend)
    .init({
        lng: getCookie('lang') || 'de',
        fallbackLng: 'de',
        backend: {
            loadPath: '/language/{{lng}}/translation.json'
        }
    }, function (err, t) {
        if (err) {
            console.error('i18next Init-Fehler:', err);
        } else {
            applyTranslations();
            document.dispatchEvent(new CustomEvent('i18nReady'));
        }
    });