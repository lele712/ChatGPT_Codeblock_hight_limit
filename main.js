// ==UserScript==
// @name         ChatGPT 代码块最大高度限制
// @namespace    https://chatgpt.com/
// @version      1.2.0
// @description  限制 ChatGPT 对话代码块的最大高度，并为右侧文本预览栏添加复制按钮
// @author       lele712
// @license      MIT
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const MAX_HEIGHT = '300px';

    const STYLE_ID = 'chatgpt-code-max-height-style';
    const TARGET_CLASS = 'chatgpt-code-scroll-target';
    const PREVIEW_SELECTOR = '[id^="artifact-text-preview-"]';
    const COPY_BUTTON_CLASS = 'chatgpt-preview-copy-button';
    const COPY_ICON = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            aria-hidden="true">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
        </svg>
    `;
    const SUCCESS_ICON = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            aria-hidden="true">
            <path d="M20 6 9 17l-5-5"></path>
        </svg>
    `;

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

    function isInPreviewPane(element) {
        return element.closest(PREVIEW_SELECTOR) !== null;
    }

    function clearTargetClass(root) {
        root.classList.remove(TARGET_CLASS);
        root.querySelectorAll(`.${TARGET_CLASS}`).forEach((element) => {
            element.classList.remove(TARGET_CLASS);
        });
    }

    function findPreviewHeader(editor) {
        let container = editor.parentElement;

        while (container && container !== document.body) {
            const header = Array.from(container.children).find((child) => {
                return child.tagName === 'HEADER';
            });

            if (header instanceof HTMLElement) {
                return header;
            }

            container = container.parentElement;
        }

        return null;
    }

    async function copyPreviewText(editor, button) {
        const content = editor.querySelector('.cm-content');

        if (!(content instanceof HTMLElement)) {
            return;
        }

        try {
            await navigator.clipboard.writeText(content.textContent || '');
            button.innerHTML = SUCCESS_ICON;
            button.setAttribute('aria-label', '已复制');
            button.title = '已复制';

            window.setTimeout(() => {
                if (button.isConnected) {
                    button.innerHTML = COPY_ICON;
                    button.setAttribute('aria-label', '复制文本');
                    button.title = '复制文本';
                }
            }, 1500);
        } catch (error) {
            console.error('复制右侧预览栏文本失败：', error);
            button.setAttribute('aria-label', '复制失败');
            button.title = '复制失败';
        }
    }

    function addPreviewCopyButton(editor) {
        if (!(editor instanceof HTMLElement)) {
            return;
        }

        const header = findPreviewHeader(editor);

        if (!(header instanceof HTMLElement)) {
            return;
        }

        const actions = header.lastElementChild;

        if (!(actions instanceof HTMLElement)) {
            return;
        }

        let button = actions.querySelector(`.${COPY_BUTTON_CLASS}`);

        if (!(button instanceof HTMLButtonElement)) {
            button = document.createElement('button');
            button.type = 'button';
            button.className = `${COPY_BUTTON_CLASS} interactive-button flex h-9 w-9 ` +
                'shrink-0 items-center justify-center rounded-lg border-0 ' +
                'bg-transparent p-0 hover:bg-token-surface-hover ' +
                'keyboard-focused:bg-token-surface-hover ' +
                'dark:hover:bg-token-main-surface-tertiary';
            button.setAttribute('aria-label', '复制文本');
            button.title = '复制文本';
            button.innerHTML = COPY_ICON;
            actions.prepend(button);
        }

        button.onclick = () => {
            copyPreviewText(editor, button);
        };
    }

    function processPreviewPanes(root = document) {
        if (root instanceof Element && root.matches(PREVIEW_SELECTOR)) {
            addPreviewCopyButton(root);
        }

        root.querySelectorAll(PREVIEW_SELECTOR).forEach((editor) => {
            addPreviewCopyButton(editor);
        });
    }

    function processCodeBlock(pre) {
        if (!(pre instanceof HTMLElement)) {
            return;
        }

        const rootPre = findRootPre(pre);

        if (!(rootPre instanceof HTMLElement)) {
            return;
        }

        // 右侧文本预览使用独立编辑器，不限制其中代码内容的高度。
        if (isInPreviewPane(rootPre)) {
            clearTargetClass(rootPre);
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
    processPreviewPanes();

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

                if (node instanceof Element) {
                    processPreviewPanes(node);
                }
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
