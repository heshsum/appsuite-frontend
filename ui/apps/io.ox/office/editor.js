/**
 * All content on this website (including text, images, source
 * code and any other original works), unless otherwise noted,
 * is licensed under a Creative Commons License.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * Copyright (C) Open-Xchange Inc., 2006-2012
 * Mail: info@open-xchange.com
 *
 * @author Malte Timmermann <malte.timmermann@open-xchange.com>
 * @author Ingo Schmidt-Rosbiegal <ingo.schmidt-rosbiegal@open-xchange.com>
 * @author Daniel Rentz <daniel.rentz@open-xchange.com>
 */

define('io.ox/office/editor', function () {

    'use strict';

    /**
     * 'Point and mark'. Represents a text position a.k.a. cursor position.
     * Member field 'para' contains the zero-based paragraph index, member
     * field 'pos' contains the zero-based character index behind the cursor
     * position.
     */
    function OXOPaM(paragraph, position) {
        this.para = paragraph;
        this.pos = position;
    }

    /**
     * Represents a text range consisting of start position and end position.
     */
    function OXOSelection(start, end) {
        this.startPaM = start;
        this.endPaM = end;
        this.hasRange = function () {
            return ((this.startPaM.para !== this.endPaM.para) || (this.startPaM.pos !== this.endPaM.pos)) ? true : false;
        };
        this.adjust = function () {
            var tmp;
            if ((this.startPaM.para > this.endPaM.para) || ((this.startPaM.para === this.endPaM.para) && (this.startPaM.pos > this.endPaM.pos)))
            {
                tmp = this.startPaM;
                this.startPaM = this.endPaM;
                this.endPaM = tmp;
            }
        };
    }

    /**
     * 'Point and mark'. Represents a text position a.k.a. cursor position.
     * Member field 'aNode' contains the selected node, member field 'aOffset'
     * contain the offset inside the node, where the selection starts.
     */
    function DOMPaM(node, offset) {
        this.node = node;
        this.offset = offset;
    }

    /**
     * Represents a text range consisting of start position and end position.
     */
    function DOMSelection(start, end) {
        this.startPaM = start;
        this.endPaM = end;
    }

    function OXOEditor(editdiv) {

        // key codes of navigation keys that will be passed directly to the browser
        var NAVIGATION_KEYS = _([
//              16, 17, 18, // Shift, Ctrl, Alt
//              20, // CapsLock
                33, 34, 35, 36, // PageUp, PageDown, End, Pos1
                37, 38, 39, 40, // Cursor Left, Up, Right, Down
                91, 92, // Left Windows, Right Windows
                144, 145 // NumLock, ScrollLock
            ]);

        var bModified = false;

        // list of operations
        var operations = [];

        // list of paragraphs as jQuery object
        var paragraphs = editdiv.children();

        /**
         * Returns whether the editor contains unsaved changes.
         */
        this.isModified = function () {
            return bModified;
        };

        /**
         * Sets the browser focus into the edit text area.
         */
        this.focus = function () {
            editdiv.focus();
        };

        this.initDocument = function () {
            var newOperation = { name: 'initDocument' };
            this.applyOperation(newOperation, true);
        };

        // OPERATIONS API

        this.clearOperations = function () {
            operations = [];
        };

        // Maybe only applyOperation_s_, where param might be operation or operation[] ?
        this.applyOperation = function (operation, bRecord) {
            // TODO
            if (bRecord) {
                this.operations.append(operation);
            }
            
            if (operation.name === "initDocument") {
                // TODO
                // Delete DOM, clear operations.
                // TDB: Create one empty paragraph?!
            }
            else if (operation.name === "insertText") {
                // TODO
                var domPos = this.getDOMPosition(operation.para, operation.pos);
                var oldText = domPos.node.text();
                var newText = oldText.slice(0, domPos.pos) + operation.text + oldText.slice(domPos.pos);
                // domPos.node.text = newText;
            }
            else if (operation.name === "deleteText") {
                // TODO
            }
        };

        this.applyOperations = function (theOperations, bRecord) {
            // TODO
        };

        this.getOperations = function () {
            return operations;
        };

        // GUI/EDITOR API

        /**
         * Returns true, if the passed keyboard event is a navigation event (cursor
         * traveling etc.) and will be passed directly to the browser.
         *
         * @param event
         *  A jQuery keyboard event object.
         */
        this.isNavigationKeyEvent = function (event) {
            return NAVIGATION_KEYS.contains(event.keyCode);
        };

        this.getPrintableChar = function (event) {
            // event.char preferred. DL2, but nyi in most browsers:(
            if (event.char) {
                return String.fromCharCode(event.char);
            }
            // event.which deprecated, but seems to work well
            if (event.which && (event.which >= 32) && (event.which <= 127)) {
                return String.fromCharCode(event.which);
            }
            // TODO: Need to handle other cases - later...
            return '';
        };

        this.hasFocus = function () {
            var bHasFocus = true;
            // TODO
            return bHasFocus;
        };

        this.getOXOSelection = function (domSelection) {

            function getOXOPositionFromDOMPosition(node, offset) {

                var pam;

                // check input values
                if (!node || (offset < 0)) {
                    return pam;
                }

                // Check, if the selected node is a descendant of "this.editdiv"
                // Converting jQuery object to DOMNode using get(0)
                // Attention: In the future "this.editdiv" is already a jQuery object.
                var editorDiv = editdiv.has(node).get(0);

                if (!editorDiv) {  // range not in text area
                    return pam;
                }

                var myParagraph = paragraphs.has(node);
                var paragraphCount = myParagraph.index();

                // Calculating the position inside the paragraph.
                // Adding the textNodes from all siblings and parents left of the node.
                // All siblings and parents can have children.
                // Finally the offset has to be added.
                var textLength = 0;
                var nodeParagraph = myParagraph.get(0);

                for (; node && (node !== nodeParagraph); node = node.parentNode) {
                    for (var prevNode = node; (prevNode = prevNode.previousSibling);) {
                        textLength += $(prevNode).text().length;
                    }
                }

                textLength = textLength + offset;

                if (myParagraph.length !== 0) {
                    pam = new OXOPaM(paragraphCount, textLength);
                }

                return pam;
            }

            // Only supporting single selection at the moment
            var startPaM = getOXOPositionFromDOMPosition.call(this, domSelection.startPaM.node, domSelection.startPaM.offset);
            var endPaM = getOXOPositionFromDOMPosition.call(this, domSelection.endPaM.node, domSelection.endPaM.offset);

            var aOXOSelection = new OXOSelection(startPaM, endPaM);

            return aOXOSelection;
        };

        this.getDOMPosition = function (para, pos) {

            window.console.log('getDOMPosition', 'Paragraph: ' + para + ' , Position: ' + pos);
            // Converting para and pos to node and offset
            var pam;

            // Is para an available paragraph? para starts with zero.
            var maxPara = $(this.paragraphs).size() - 1;
            if (para > maxPara) {
                window.console.log('getDOMPosition', 'Warning: Paragraph ' + para + ' is out of range. Last paragraph: ' + maxPara);
                return pam;
            }

            // Checking if this paragraph has children
            var myParagraph = $(this.paragraphs).get(para);
            if (! myParagraph.hasChildNodes()) {
                window.console.log('getDOMPosition', 'Warning: Paragraph is empty');
                return pam;
            }

            // Checking if all children of this paragraph have enough text content to reach pos
            var maxTextLength = 0;
            var nodeList = myParagraph.childNodes;
            for (var i = 0; i < nodeList.length; i++) {
                maxTextLength += $(nodeList[i]).text().length;
            }

            if (maxTextLength < pos) {
                window.console.log('getDOMPosition', 'Warning: Paragraph does not contain position: ' + pos + '. Last position: ' + maxTextLength);
                return pam;
            }

            var textLength = 0;
            var currentNode = nodeList.firstChild;

            while (myParagraph.hasChildNodes()) {

                nodeList = myParagraph.childNodes;

                for (var i = 0; i < nodeList.length; i++) {
                    // Searching the children
                    currentNode = nodeList[i];
                    var currentLength = $(nodeList[i]).text().length;
                    if (textLength + currentLength > pos) {
                        myParagraph = currentNode;
                        break;  // leaving the for-loop
                    } else {
                        textLength += currentLength;
                        window.console.log('getDOMPosition', 'Complete length: ' + textLength);
                    }
                }
            }

            var node = currentNode;
            var offset = pos - textLength;
            window.console.log('getDOMPosition', 'Result: ' + node + " : " + offset);

            pam = new DOMPaM();
            pam.aNode = node;
            pam.aOffset = offset;

            return pam;
        };
        
        this.getDOMSelection = function (oxoSelection) {

            // Only supporting single selection at the moment
            var startPaM = this.getDOMPosition(oxoSelection.aStartPaM.nPara, oxoSelection.aStartPaM.nPos);
            var endPaM = this.getDOMPosition(oxoSelection.aEndPaM.nPara, oxoSelection.aEndPaM.nPos);

            var domSelection;
            if ((startPaM) && (endPaM)) {
                domSelection = new DOMSelection(startPaM, endPaM);
            }

            return domSelection;
        };


        this.getCurrentDOMSelection = function () {
            // DOMSelection consists of Node and Offset for startpoint and for endpoint
            var windowSel = window.getSelection();
            var startPaM = new DOMPaM(windowSel.anchorNode, windowSel.anchorOffset);
            var endPaM = new DOMPaM(windowSel.focusNode, windowSel.focusOffset);
            var domSelection = new DOMSelection(startPaM, endPaM);

            return domSelection;
        };

        // The current OXOSelection can be read from operations.
        // This is a test function, that delivers an OXOSelection
        // object with arbitrary values. Needs to be changed in
        // the future.
        this.getCurrentOXOSelection = function () {

            // Setting arbitrary values for paragraph and position
            // for the startPoint and the endPoint
            var startPaM = new OXOPaM(1, 10);
            var endPaM = new OXOPaM(2, 24);

            var aOXOSelection = new OXOSelection(startPaM, endPaM);
            return aOXOSelection;
        };

        this.processKeyDown = function (event) {

            // TODO: How to strip away debug code?
            if (event.keyCode && event.shiftKey && event.ctrlKey && event.altKey) {
                var c = this.getPrintableChar(event);
                if (c === 'P') {
                    alert('#Paragraphs: ' + this.paragraphs.length);
                }
                if (c === 'S') {
                    alert('#Paragraphs: ' + this.paragraphs.length);
                }
            }

            if (!this.isNavigationKeyEvent(event)) {
                // Don't block keyDown, or we will never get keyPressed...
                // Check with different browsers...

                // event.preventDefault();
            }
        };

        this.processKeyPressed = function (event) {
            var bBlock = true;

            if (!this.isNavigationKeyEvent(event)) {

                var c = this.getPrintableChar(event);

                // TODO
                // For now (the prototype), only accept single chars, but let the browser process, so we don't need to care about DOM stuff
                // TODO: But we at least need to check if there is a selection!!!

                if (c.length === 1) {

                    // Demo code for calculating DOMSelection from OXOSelection
                    if (0) {
                        var aOXOSelection = this.getCurrentOXOSelection();
                        var aDOMSelection = this.getDOMSelection(aOXOSelection);

                        if (aDOMSelection) {
                            window.console.log('processKeyPressed', 'StartPaM: ' + aDOMSelection.aStartPaM.aNode + ' : ' + aDOMSelection.aStartPaM.aOffset);
                            window.console.log('processKeyPressed', 'EndPaM: ' + aDOMSelection.aEndPaM.aNode + ' : ' + aDOMSelection.aEndPaM.aOffset);

                            var range = document.createRange();
                            range.setStart(aDOMSelection.aStartPaM.aNode, aDOMSelection.aStartPaM.aOffset);
                            range.setEnd(aDOMSelection.aEndPaM.aNode, aDOMSelection.aEndPaM.aOffset);
                            var sel = window.getSelection();
                            sel.removeAllRanges();
                            sel.addRange(range);
                        }
                    }

                    // Code for calculating OXOSelection from DOMSelection
                    this.deleteSelected();
                    var domSelection = this.getCurrentDOMSelection();
                    var selection = this.getOXOSelection(domSelection);
                    window.console.log('processKeyPressed', 'OXOSelection, start: ' + selection.startPaM.para + " : " + selection.startPaM.pos);
                    window.console.log('processKeyPressed', 'OXOSelection, end: ' + selection.endPaM.para + " : " + selection.endPaM.pos);
                    if (selection !== undefined) {
                        this.insertText(c, selection.endPaM.para, selection.endPaM.pos);
                    }
                }

                if (bBlock) {
                    event.preventDefault();
                }
            }
        };

        this.deleteSelected = function () {
            var i, nStartPos, nEndPos;
            var domSelection = this.getCurrentDOMSelection();
            var selection = this.getOXOSelection(domSelection);
            if ((selection !== undefined) && (selection.hasRange())) {
                // Split into multiple operations:
                // 1) delete selected part in first para (pos to end)
                // 2) delete completly slected paragraphs completely
                // 3) delete selected part in last para (start to pos)
                selection.adjust();
                nStartPos = selection.startPaM.pos;
                nEndPos = selection.endPaM.pos;
                if (selection.startPaM.para !== selection.endPaM.para) {
                    nEndPos = 0xFFFF; // TODO: Real para end
                }
                this.deleteText(selection.startPaM.para, nStartPos, nEndPos);
                for (i = selection.startPaM.para + 1; i < selection.endPaM.para; i++)
                {
                    // startPaM.para+1 instead of i, because we allways remove a paragraph
                    this.deleteParagraph(selection.startPaM.para + 1);
                }
                if (selection.startPaM.para !== selection.endPaM.para) {
                    this.deleteText(selection.startPaM.para + 1, 0, selection.endPaM.pos);
                }
            }
        };
        
        this.deleteText = function (para, start, end) {
            if (start !== end) {
                var newOperation = { name: 'deleteText', para: para, start: start, end: end };
                this.applyOperation(newOperation, true);
            }
        };

        this.deleteParagraph = function (para) {
            var newOperation = { name: 'deleteParagraph', para: para };
            this.applyOperation(newOperation, true);
        };

        this.insertParagraph = function (para) {
            var newOperation = { name: 'insertParagraph', para: para };
            this.applyOperation(newOperation, true);
        };

        // For now, only stuff that we really need, not things that a full featured API would probably offer
        // this.getParagraphCount() = function() {
        //  // TODO
        //  return 1;
        // };

        this.insertText = function (text, para, pos) {
            var newOperation = { name: 'insertText', text: text, para: para, pos: pos };
            this.applyOperation(newOperation, true);
        };

        this.setAttributes = function (para, pos) {
            // TODO
        };

        // hybrid edit mode
        editdiv
            .on('keydown', $.proxy(this, 'processKeyDown'))
            .on('keypress', $.proxy(this, 'processKeyPressed'))
            // TODO
            .on('dragover drop', $.proxy(this, 'xxx'))
            .on('contextmenu', $.proxy(this, 'xxx'));

    } // end of OXOEditor()

    return OXOEditor;
});
