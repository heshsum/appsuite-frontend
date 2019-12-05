const { I } = inject();

module.exports = {
    waitForApp() {
        // wait untill all importand nodes are drawn
        I.waitForElement('.file-list-view.complete');
        I.waitForVisible({ css: '.io-ox-files-window .folder-tree' }, 5);
        // TODO this does not always work. When the user is in the "Myshares" folder, this will not be visible
        I.waitForVisible({ css: '.io-ox-files-window .window-body > .classic-toolbar-container .classic-toolbar' }, 5);
        I.waitForVisible({ css: '.window-content .secondary-toolbar .breadcrumb-view' }, 5);
        // wait a bit because breadcrumb has some redraw issues atm (redraws 7 times)
        // TODO Fix the redraw issue
        I.wait(0.5);
    },
    waitForViewer() {
        I.waitForText('Details', 10, '.io-ox-viewer .sidebar-panel-title');
    },
    shareItem(type) {
        I.waitForVisible(locate({ css: '[data-dropdown="io.ox/files/toolbar/share"]' }).inside('.classic-toolbar-container'));
        I.wait(0.2);
        I.click(locate({ css: '[data-dropdown="io.ox/files/toolbar/share"]' }).inside('.classic-toolbar-container'));
        I.clickDropdown(type);
        I.waitForDetached('.dropdown.open');
        I.waitForVisible('.modal-dialog');
        I.waitForFocus('.modal-dialog input[type="text"][id^="form-control-label"]');
    }
};
