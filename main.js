// ==UserScript==
// @name         ChatGPT 代码块最大高度限制
// @namespace    https://chatgpt.com/
// @version      1.1.3
// @description  限制 ChatGPT 代码内容区域的最大高度，超出后显示滚动条
// @author       lele712
// @license      MIT
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const MAX_HEIGHT = '500px';

    const STYLE_ID = 'chatgpt-code-max-height-style';
    const TARGET_CLASS = 'chatgpt-code-scroll-target';

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;

        style.textContent = `
            .${TARGET_CLASS} {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                box-sizing: border-box !important;

                max-height: ${MAX_HEIGHT} !important;
                overflow-y: auto !important;
                overflow-x: auto !important;
                overscroll-behavior: contain;
                scrollbar-gutter: stable;

                scrollbar-width: thin !important;
                scrollbar-color: rgba(128, 128, 128, 0.75)
                    transparent !important;
            }

            code.${TARGET_CLASS} {
                display: block !important;
            }

            .${TARGET_CLASS}::-webkit-scrollbar {
                width: 10px !important;
                height: 10px !important;
            }

            .${TARGET_CLASS}::-webkit-scrollbar-thumb {
                min-width: 32px !important;
                min-height: 32px !important;
                border: 2px solid transparent !important;
                border-radius: 999px !important;
                background-color: rgba(128, 128, 128, 0.75) !important;
                background-clip: padding-box !important;
            }

            .${TARGET_CLASS}::-webkit-scrollbar-thumb:hover {
                background-color: rgba(128, 128, 128, 0.95) !important;
            }

            .${TARGET_CLASS}::-webkit-scrollbar-track {
                background: transparent !important;
            }

            .${TARGET_CLASS}::-webkit-scrollbar-corner {
                background: transparent !important;
            }
        `;

        document.head.appendChild(style);
    }

    function findRootPre(node) {
        let pre = node.matches('pre')
            ? node
            : node.closest('pre');

        if (!(pre instanceof HTMLElement)) {
            return null;
        }

        while (pre.parentElement) {
            const parentPre = pre.parentElement.closest('pre');

            if (!(parentPre instanceof HTMLElement)) {
                break;
            }

            pre = parentPre;
        }

        return pre;
    }

    function findScrollTarget(pre) {
        return (
            pre.querySelector('.cm-editor .cm-content') ||
            pre.querySelector('#code-block-viewer .cm-content') ||
            pre.querySelector('.cm-editor .cm-scroller') ||
            pre.querySelector('#code-block-viewer .cm-scroller') ||
            pre.querySelector(':scope > code')
        );
    }

    function processCodeBlock(pre) {
        if (!(pre instanceof HTMLElement)) {
            return;
        }

        const rootPre = findRootPre(pre);

        if (!(rootPre instanceof HTMLElement)) {
            return;
        }

        const target = findScrollTarget(rootPre);

        if (!(target instanceof HTMLElement)) {
            return;
        }

        rootPre.querySelectorAll(`.${TARGET_CLASS}`).forEach((element) => {
            if (element !== target) {
                element.classList.remove(TARGET_CLASS);
            }
        });

        if (rootPre !== target) {
            rootPre.classList.remove(TARGET_CLASS);
        }

        target.classList.add(TARGET_CLASS);
    }

    function processNode(node) {
        if (!(node instanceof Element)) {
            return;
        }

        const rootPre = findRootPre(node);

        if (rootPre) {
            processCodeBlock(rootPre);
        }

        const processed = new Set();

        node.querySelectorAll('pre').forEach((pre) => {
            const candidate = findRootPre(pre);

            if (candidate && !processed.has(candidate)) {
                processed.add(candidate);
                processCodeBlock(candidate);
            }
        });
    }

    injectStyle();

    const processed = new Set();

    document.querySelectorAll('pre').forEach((pre) => {
        const rootPre = findRootPre(pre);

        if (rootPre && !processed.has(rootPre)) {
            processed.add(rootPre);
            processCodeBlock(rootPre);
        }
    });

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                processNode(node);
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
