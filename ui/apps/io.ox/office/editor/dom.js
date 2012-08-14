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
 * @author Daniel Rentz <daniel.rentz@open-xchange.com>
 */

define('io.ox/office/editor/dom', ['io.ox/office/tk/utils'], function (Utils) {

    'use strict';

    // static class DOM =======================================================

    /**
     * Provides classes representing DOM points (DOM.Point) and ranges
     * (DOM.Range), and static helper methods for basic editor DOM
     * manipulation, and access the browser selection.
     */
    var DOM = {};

    // class DOM.Point ========================================================

    /**
     * A DOM text point contains a 'node' attribute referring to a DOM node,
     * and an 'offset' attribute containing an integer offset specifying the
     * position in the contents of the node.
     *
     * @param {Node|jQuery} node
     *  The DOM node selected by this DOM.Point instance. If this object is a
     *  jQuery collection, uses the first DOM node it contains.
     *
     * @param {Number} [offset]
     *  An integer offset relative to the DOM node specifying the position in
     *  the node's contents. If the node is a text node, the offset represents
     *  the character position in the node text. If the node is an element
     *  node, the offset specifies the index of a child node of this node. The
     *  value of the offset may be equal to the text length respectively the
     *  number of child nodes, in this case the DOM point refers to the
     *  position directly after the node's contents. If omitted, this DOM.Point
     *  instance refers to the start of the entire node, instead of specific
     *  contents.
     */
    DOM.Point = function (node, offset) {
        this.node = Utils.getDomNode(node);
        this.offset = offset;
    };

    // methods ----------------------------------------------------------------

    /**
     * Returns a new clone of this DOM point.
     */
    DOM.Point.prototype.clone = function () {
        return new DOM.Point(this.node, this.offset);
    };

    /**
     * Validates the offset of this DOM point. Restricts the offset to the
     * available index range according to the node's contents, or
     * initializes the offset, if it is missing.
     *
     * If this instance points to a text node, the offset will be
     * restricted to the text in the node, or set to zero if missing.
     *
     * If this instance points to an element node, the offset will be
     * restricted to the number of child nodes in the node. If the offset
     * is missing, it will be set to the index of the node in its siblings,
     * and the node will be replaced by its parent node.
     *
     * @returns {DOM.Point}
     *  A reference to this instance.
     */
    DOM.Point.prototype.validate = function () {

        // element: if offset is missing, take own index and refer to the parent node
        if (Utils.isElementNode(this.node)) {
            if (_.isNumber(this.offset)) {
                this.offset = Math.min(Math.max(this.offset, 0), this.node.childNodes.length);
            } else {
                this.offset = $(this.node).index();
                this.node = this.node.parentNode;
            }

        // text node: if offset is missing, use zero
        } else if (Utils.isTextNode(this.node)) {
            if (_.isNumber(this.offset)) {
                this.offset = Math.min(Math.max(this.offset, 0), this.node.nodeValue.length);
            } else {
                this.offset = 0;
            }
        }

        return this;
    };

    // static methods ---------------------------------------------------------

    DOM.Point.createPointForNode = function (node) {
        return new DOM.Point(node).validate();
    };

    /**
     * Returns whether the two passed DOM points are equal.
     *
     * @param {DOM.Point} point1
     *  The first DOM point. Must be valid (see DOM.Point.validate() method for
     *  details).
     *
     * @param {DOM.Point} point2
     *  The second DOM point. Must be valid (see DOM.Point.validate() method
     *  for details).
     *
     * @returns {Boolean}
     *  Whether the DOM points are equal.
     */
    DOM.Point.equalPoints = function (point1, point2) {
        return (point1.node === point2.node) && (point1.offset === point2.offset);
    };

    /**
     * Returns an integer indicating how the two DOM points are located to each
     * other.
     *
     * @param {DOM.Point} point1
     *  The first DOM point. Must be valid (see DOM.Point.validate() method for
     *  details).
     *
     * @param {DOM.Point} point2
     *  The second DOM point. Must be valid (see DOM.Point.validate() method
     *  for details).
     *
     * @returns {Number}
     *  The value zero, if the DOM points are equal, a negative number, if
     *  point1 precedes point2, or a positive number, if point1 follows point2.
     */
    DOM.Point.comparePoints = function (point1, point2) {

        // Returns the index of the inner node's ancestor in the outer node's
        // children list. 'outerNode' MUST contain 'innerNode'.
        function calculateOffsetInOuterNode(outerNode, innerNode) {
            while (innerNode.parentNode !== outerNode) {
                innerNode = innerNode.parentNode;
            }
            return $(innerNode).index();
        }

        // equal nodes: compare by offset
        if (point1.node === point2.node) {
            return point1.offset - point2.offset;
        }

        // Node in point1 contains the node in point2: point1 is before point2,
        // if offset of point1 (index of its child node) is less than or equal
        // to the offset of point2's ancestor node in the children of point1's
        // node. If offsets are equal, point2 is a descendant of the child node
        // pointed to by point1 and therefore located after point1.
        if (point1.node.contains(point2.node)) {
            return (point1.offset <= calculateOffsetInOuterNode(point1.node, point2.node)) ? -1 : 1;
        }

        // Node in point2 contains the node in point1: see above, reversed.
        if (point2.node.contains(point1.node)) {
            return (calculateOffsetInOuterNode(point2.node, point1.node) < point2.offset) ? -1 : 1;
        }

        // Neither node contains the other: compare nodes regardless of offset.
        return Utils.compareNodes(point1.node, point2.node);
    };

    // class DOM.Range ========================================================

    /**
     * A DOM text range represents a half-open range in the DOM tree. It
     * contains 'start' and 'end' attributes referring to DOM point objects.
     *
     * @param {DOM.Point} start
     *  The DOM point where the range starts.
     *
     * @param {DOM.Point} [end]
     *  The DOM point where the range ends. If omitted, uses the start position
     *  to construct a collapsed range (a simple 'cursor').
     */
    DOM.Range = function (start, end) {
        this.start = start;
        this.end = _.isObject(end) ? end : _.clone(start);
    };

    // methods ----------------------------------------------------------------

    /**
     * Returns a new clone of this DOM range.
     */
    DOM.Range.prototype.clone = function () {
        return new DOM.Range(this.start.clone(), this.end.clone());
    };

    /**
     * Validates the start and end position of this DOM range. See method
     * DOM.Point.validate() for details.
     */
    DOM.Range.prototype.validate = function () {
        this.start.validate();
        this.end.validate();
        return this;
    };

    /**
     * Swaps start and end position, if the start position is located after
     * the end position in the DOM tree.
     */
    DOM.Range.prototype.adjust = function () {
        if (DOM.Point.comparePoints(this.start, this.end) > 0) {
            var tmp = this.start;
            this.start = this.end;
            this.end = tmp;
        }
        return this;
    };

    /**
     * Returns whether the DOM range is collapsed, i.e. start position and
     * end position are equal.
     *
     * @returns {Boolean}
     *  Whether this DOM range is collapsed.
     */
    DOM.Range.prototype.isCollapsed = function () {
        return DOM.Point.equalPoints(this.start, this.end);
    };

    // static methods ---------------------------------------------------------

    /**
     * Creates a new DOM.Range instance from the passed nodes and offsets.
     *
     * @param {Node|jQuery} startNode
     *  The DOM node used for the start point of the created range. If this
     *  object is a jQuery collection, uses the first DOM node it contains.
     *
     * @param {Number} [startOffset]
     *  The offset for the start point of the created range.
     *
     * @param {Node|jQuery} [endNode]
     *  The DOM node used for the end point of the created range. If this
     *  object is a jQuery collection, uses the first DOM node it contains. If
     *  omitted, creates a collapsed range by cloning the start position.
     *
     * @param {Number} [endOffset]
     *  The offset for the end point of the created range. Not used, if endNode
     *  has been omitted.
     *
     * @returns {DOM.Range}
     *  The new DOM range object.
     */
    DOM.Range.createRange = function (startNode, startOffset, endNode, endOffset) {
        return new DOM.Range(new DOM.Point(startNode, startOffset), _.isObject(endNode) ? new DOM.Point(endNode, endOffset) : undefined);
    };

    DOM.Range.createRangeForNode = function (node) {
        var range = new DOM.Range(DOM.Point.createPointForNode(node));
        if (Utils.isTextNode(range.end.node)) {
            range.end.offset = range.end.node.nodeValue.length;
        } else {
            range.end.offset += 1;
        }
        return range;
    };

    // static functions =======================================================

    // text node manipulation -------------------------------------------------

    /**
     * Ensures that the passed text node is embedded in its own <span> element.
     * If the <span> element is missing, it will be inserted into the DOM.
     *
     * @param {Text} textNode
     *  The DOM text node to be embedded in a <span> element.
     *
     * @returns {HTMLElement}
     *  The parent <span> element (already existing or just created) of the
     *  text node.
     */
    DOM.wrapTextNode = function (textNode) {

        var // parent element of the text node
            parent = textNode.parentNode;

        if (Utils.getNodeName(parent) !== 'span') {

            // put text node into a span element, if not existing
            $(textNode).wrap('<span>');
            parent = textNode.parentNode;

            // Copy the paragraph's font-size to the span, and reset the
            // font-size of the paragraph, otherwise CSS defines a lower limit
            // for the line-height of all spans according to the parent
            // paragraph's font-size.
            $(parent).css('font-size', $(parent.parentNode).css('font-size'));
            $(parent.parentNode).css('font-size', '0');
        }

        return parent;
    };

    /**
     * Splits the passed text node into two text nodes. Additionally ensures
     * that both text nodes are embedded in their own <span> elements.
     *
     * @param {Text} textNode
     *  The DOM text node to be split.
     *
     * @param {Number} offset
     *  The character position the text node will be split. If this position is
     *  at the start or end of the text of the node, an empty text node may be
     *  inserted if required (see the 'options.createEmpty' option below).
     *
     * @param {Object} [options]
     *  A map of options to control the split operation. Supports the following
     *  options:
     *  @param {Boolean} [options.append]
     *      If set to true, the right part of the text will be inserted after
     *      the passed text node; otherwise the left part of the text will be
     *      inserted before the passed text node. May be important when
     *      iterating and manipulating a range of DOM nodes.
     *  @param {Boolean} [options.createEmpty]
     *      If set to true, creates new text nodes also if the offset points to
     *      the start or end of the text. The new text node will be empty.
     *      Otherwise, no new text node will be created in this case, and the
     *      method returns null.
     *
     * @returns {Text|Null}
     *  The newly created text node. Will be located before or after the passed
     *  text node, depending on the 'options.append' option. If no text node
     *  has been created (see the 'options.createEmpty' option above), returns
     *  null.
     */
    DOM.splitTextNode = function (textNode, offset, options) {

        var // put text node into a span element, if not existing
            span = DOM.wrapTextNode(textNode),
            // the new span for the split text portion, as jQuery object
            newSpan = null,
            // text for the left span
            leftText = textNode.nodeValue.substr(0, offset),
            // text for the right span
            rightText = textNode.nodeValue.substr(offset);

        // check if a new text node has to be created
        if (Utils.getBooleanOption(options, 'createEmpty') || (leftText.length && rightText.length)) {
            // create the new span
            newSpan = $(span).clone();
            // insert the span and update the text nodes
            if (Utils.getBooleanOption(options, 'append')) {
                newSpan.insertAfter(span);
                textNode.nodeValue = leftText;
                newSpan.text(rightText);
            } else {
                newSpan.insertBefore(span);
                newSpan.text(leftText);
                textNode.nodeValue = rightText;
            }
        }

        // return the new text node
        return newSpan ? newSpan[0].firstChild : null;
    };

    /**
     * Returns the text node of the next or previous sibling of the passed
     * node. Checks that the sibling node is a span element, and contains
     * exactly one text node.
     *
     * @param {Node|jQuery} node
     *  The original DOM node. If this node is a text node, checks that it is
     *  contained in its own <span> element and traverses to the next or
     *  previous sibling of that span. Otherwise, directly traverses to the
     *  next or previous sibling of the passed element node. If this object is
     *  a jQuery collection, uses the first DOM node it contains.
     *
     * @param {Boolean} next
     *  If set to true, searches for the next sibling text node, otherwise
     *  searches for the previous sibling text node.
     *
     * @returns {Text|Null}
     *  The sibling text node if existing, otherwise null.
     */
    DOM.getSiblingTextNode = function (node, next) {

        function isTextSpan(span) {
            return span && (Utils.getNodeName(span) === 'span') && (span.childNodes.length === 1) && Utils.isTextNode(span.firstChild);
        }

        // if the passed node is a text node, get its <span> parent element
        node = Utils.getDomNode(node);
        if (Utils.isTextNode(node)) {
            node = isTextSpan(node.parentNode) ? node.parentNode : null;
        }

        // go to next or previous sibling of the element
        if (node && Utils.isElementNode(node)) {
            node = next ? node.nextSibling : node.previousSibling;
        }

        // extract the text node from the sibling element
        return isTextSpan(node) ? node.firstChild : null;
    };

    // range iteration --------------------------------------------------------

    DOM.validateAndSortRanges = function (ranges) {

        // validate all ranges, adjust start/end points
        _.chain(ranges).invoke('validate').invoke('adjust');

        // sort the ranges by start point in DOM order
        ranges.sort(function (range1, range2) {
            return DOM.Point.comparePoints(range1.start, range2.start);
        });

        // merge ranges with their next siblings, if they overlap
        for (var index = 0; index < ranges.length; index += 1) {
            while ((index + 1 < ranges.length) && (DOM.Point.comparePoints(ranges[index].end, ranges[index + 1].start) >= 0)) {
                if (DOM.Point.comparePoints(ranges[index].end, ranges[index + 1].end) < 0) {
                    ranges[index].end = ranges[index + 1].end;
                }
                ranges.splice(index + 1, 1);
            }
        }
    };

    /**
     * Iterates over all DOM nodes contained in the specified DOM text ranges.
     *
     * @param {DOM.Range[]} ranges
     *  (in/out) The DOM ranges whose nodes will be iterated. Before iteration
     *  starts, the DOM ranges in this array will be validated (see method
     *  DOM.Range.validate() for details) and adjusted (see method
     *  DOM.Range.adjust() for details). Then, the array will be sorted by the
     *  starting points of all DOM ranges, and overlapping ranges will be
     *  merged together. The iterator function may further manipulate this
     *  array while iterating, see the comments in the description of the
     *  parameter 'iterator' for details.
     *
     * @param {Function} iterator
     *  The iterator function that will be called for every node. Receives the
     *  DOM node object as first parameter, the current DOM range as second
     *  parameter, its index in the sorted array of DOM ranges as third
     *  parameter, and the entire sorted array of DOM ranges as fourth
     *  parameter. If the iterator returns the Utils.BREAK object, the
     *  iteration process will be stopped immediately. The iterator may
     *  manipulate the end point of the current DOM range, or the DOM ranges in
     *  the array following the current DOM range, which will affect the
     *  iteration process accordingly. Changing the starting point of the
     *  current DOM range, or anything in the preceding DOM ranges in the array
     *  will not have any effect. If the iterator modifies the DOM tree, it
     *  MUST ensure that following DOM ranges in the array that refer to
     *  deleted nodes or their descendants, or depend on any other DOM tree
     *  change, will be updated accordingly.
     *
     * @param {Object} [context]
     *  If specified, the iterator will be called with this context (the symbol
     *  'this' will be bound to the context inside the iterator function).
     *
     * @returns {Utils.BREAK|Undefined}
     *  A reference to the Utils.BREAK object, if the iterator has returned
     *  Utils.BREAK to stop the iteration process, otherwise undefined.
     */
    DOM.iterateNodesInRanges = function (ranges, iterator, context) {

        var // loop variables
            index = 0, range = null, node = null;

        // shortcut for call to iterator function
        function callIterator() { return iterator.call(context, node, range, index, ranges); }

        // adjust start/end points of all ranges, sort the ranges in DOM order, merge overlapping ranges
        DOM.validateAndSortRanges(ranges);

        for (index = 0; index < ranges.length; index += 1) {
            range = ranges[index];

            // get first node in DOM range
            node = range.start.node;
            if (node.nodeType === 1) {
                // element/child node position, go to child node described by offset
                node = node.childNodes[range.start.offset];
            }

            // always visit the node if selected by a cursor
            if (node && range.isCollapsed()) {
                // call iterator for the node, return if iterator returns Utils.BREAK
                if (callIterator() === Utils.BREAK) { return Utils.BREAK; }
                continue;
            }

            // skip first text node, if DOM range starts directly at its end
            // TODO: is this the desired behavior?
            if (node && (node.nodeType === 3) && (range.start.offset >= node.nodeValue.length)) {
                node = Utils.getNextNodeInTree(node);
            }

            // iterate as long as the end of the range has not been reached
            while (node && (DOM.Point.comparePoints(DOM.Point.createPointForNode(node), range.end) < 0)) {
                // call iterator for the node, return if iterator returns Utils.BREAK
                if (callIterator() === Utils.BREAK) { return Utils.BREAK; }
                // find next node
                node = Utils.getNextNodeInTree(node);
            }
        }
    };

    /**
     * Iterates over specific ancestor element nodes of the nodes contained in
     * the specified DOM ranges that match the passed jQuery selector. Each
     * ancestor node is visited exactly once even if it is the ancestor of
     * multiple nodes covered in the passed selection.
     *
     * @param {DOM.Range[]} ranges
     *  (in/out) The DOM ranges whose nodes will be iterated. The array will be
     *  validated and sorted before iteration starts (see method
     *  DOM.iterateNodesInRanges() for details).
     *
     * @param {HTMLElement|jQuery} rootNode
     *  The root node containing the DOM ranges. While searching for ancestor
     *  nodes, this root node will never be left, but it may be selected as
     *  ancestor node by itself. If this object is a jQuery collection, uses
     *  the first node it contains.
     *
     * @param {String} selector
     *  A jQuery selector that will be used to find an element while traversing
     *  the chain of parents of the node currently iterated.
     *
     * @param {Function} iterator
     *  The iterator function that will be called for every found ancestor
     *  node. Receives the DOM node object as first parameter, the current DOM
     *  range as second parameter, its index in the sorted array of DOM ranges
     *  as third parameter, and the entire sorted array of DOM ranges as fourth
     *  parameter. If the iterator returns the Utils.BREAK object, the
     *  iteration process will be stopped immediately. See the comments for the
     *  method DOM.iterateNodesInRanges() for details about manipulation of the
     *  array of DOM ranges and the DOM tree.
     *
     * @param {Object} [context]
     *  If specified, the iterator will be called with this context (the symbol
     *  'this' will be bound to the context inside the iterator function).
     *
     * @returns {Utils.BREAK|Undefined}
     *  A reference to the Utils.BREAK object, if the iterator has returned
     *  Utils.BREAK to stop the iteration process, otherwise undefined.
     */
    DOM.iterateAncestorNodesInRanges = function (ranges, rootNode, selector, iterator, context) {

        var // all matching nodes the iterator has been called for
            matchingNodes = [];

        rootNode = Utils.getDomNode(rootNode);

        // iterate over all nodes, and try to find the specified parent nodes
        return DOM.iterateNodesInRanges(ranges, function (node, range, index, ranges) {

            // shortcut for call to iterator function
            function callIterator() { return iterator.call(context, node, range, index, ranges); }

            // try to find a matching element inside the root node
            while (node) {
                if ($(node).is(selector)) {
                    // skip node if it has been found before
                    if (!_(matchingNodes).contains(node)) {
                        matchingNodes.push(node);
                        if (callIterator() === Utils.BREAK) { return Utils.BREAK; }
                    }
                    return;
                }
                if (node === rootNode) { return; }
                node = node.parentNode;
            }
        });
    };

    /**
     * Iterates over all text nodes contained in the specified DOM ranges. The
     * iterator function will receive the text node and the character range in
     * its text contents that is covered by the specified DOM ranges.
     *
     * @param {DOM.Range[]} ranges
     *  (in/out) The DOM ranges whose text nodes will be iterated. The array
     *  will be validated and sorted before iteration starts (see method
     *  DOM.iterateNodesInRanges() for details).
     *
     * @param {Function} iterator
     *  The iterator function that will be called for every text node. Receives
     *  the DOM text node object as first parameter, the offset of the first
     *  character as second parameter, the offset after the last character as
     *  third parameter, the current DOM range as fourth parameter, its index
     *  in the sorted array of DOM ranges as fifth parameter, and the entire
     *  sorted array of DOM ranges as sixth parameter. If the iterator returns
     *  the Utils.BREAK object, the iteration process will be stopped
     *  immediately. See the comments for the method DOM.iterateNodesInRanges()
     *  for details about manipulation of the array of DOM ranges and the DOM
     *  tree.
     *
     * @param {Object} [context]
     *  If specified, the iterator will be called with this context (the symbol
     *  'this' will be bound to the context inside the iterator function).
     *
     * @param {Object} [options]
     *  A map of options to control the iteration process. Supports the
     *  following options:
     *  @param {Boolean} [options.split]
     *      If set to true, text nodes that are not covered completely by a DOM
     *      range will be split before the iterator function will be called.
     *      The iterator function will always receive a text node and a
     *      character range that covers the text of that node completely.
     *  @param {Function} [options.merge]
     *      If set to a function, the visited text node may be merged with one
     *      or both of its sibling text nodes after the iterator function
     *      returns. The function attached to this option will be called once
     *      or twice, always receiving exactly two DOM text nodes. It must
     *      return whether these two text nodes can be merged to one text node.
     *      It will be called once for the previous sibling of the visited text
     *      node, and once for its next sibling (only if these sibling text
     *      nodes exist).
     *
     * @returns {Utils.BREAK|Undefined}
     *  A reference to the Utils.BREAK object, if the iterator has returned
     *  Utils.BREAK to stop the iteration process, otherwise undefined.
     */
    DOM.iterateTextPortionsInRanges = function (ranges, iterator, context, options) {

        var // split partly covered the text nodes before visiting them
            split = Utils.getBooleanOption(options, 'split', false),
            // predicate whether to merge sibling text nodes after visiting them
            merge = Utils.getFunctionOption(options, 'merge'),
            // last visited text node and range, used in following iteration steps
            lastTextNode = null, lastRange = null;

        function replaceTextNodeInRanges(ranges, index, next, oldTextNode, newTextNode, offsetDiff) {

            for (var range = null; next ? (index < ranges.length) : (0 <= index); next ? (index += 1) : (index -= 1)) {
                range = ranges[index];

                // update start point
                if (range.start.node === oldTextNode) {
                    range.start.node = newTextNode;
                    range.start.offset += offsetDiff;
                }

                // update end point
                if (range.end.node === oldTextNode) {
                    range.end.node = newTextNode;
                    range.end.offset += offsetDiff;
                }
            }
        }

        // Split the passed text node if it is not covered completely.
        function splitTextNode(textNode, start, end, ranges, index) {

            var // following text node when splitting this text node
                newTextNode = null;

            // split text node to move the portion before start into its own span
            if (start > 0) {
                newTextNode = DOM.splitTextNode(textNode, start);
                // adjust offsets of all following DOM ranges that refer to the text node
                replaceTextNodeInRanges(ranges, index, true, textNode, textNode, -start);
                // new end position in shortened text node
                end -= start;
            }

            // split text node to move the portion after end into its own span
            if (end < textNode.nodeValue.length) {
                newTextNode = DOM.splitTextNode(textNode, end, { append: true });
                // adjust all following DOM ranges that refer now to the new following text node
                replaceTextNodeInRanges(ranges, index + 1, true, textNode, newTextNode, -end);
            }
        }

        // Tries to merge the passed text node with its next or previous sibling.
        function mergeSiblingTextNode(textNode, next, ranges, index) {

            var // the sibling text node, depending on the passed direction
                siblingTextNode = DOM.getSiblingTextNode(textNode, next),
                // text in the passed and in the sibling node
                text = null, siblingText = null;

            if (siblingTextNode && merge.call(context, textNode, siblingTextNode)) {
                // read texts from both text nodes
                text = textNode.nodeValue;
                siblingText = siblingTextNode.nodeValue;
                // add text of the sibling text node to the passed text node, and update DOM ranges
                if (next) {
                    textNode.nodeValue = text + siblingText;
                    replaceTextNodeInRanges(ranges, index, true, siblingTextNode, textNode, text.length);
                } else {
                    textNode.nodeValue = siblingText + text;
                    replaceTextNodeInRanges(ranges, index, true, textNode, textNode, siblingText.length);
                    replaceTextNodeInRanges(ranges, index, false, siblingTextNode, textNode, 0, false);
                }
                // remove the entire sibling span element
                $(siblingTextNode.parentNode).remove();
            }
            return siblingTextNode;
        }

        // iterate over all nodes, and process the text nodes
        return DOM.iterateNodesInRanges(ranges, function (node, range, index, ranges) {

            var // cursor instead of selection
                isCursor = range.isCollapsed(),
                // start and end offset of covered text in the text node
                start = 0, end = 0;

            // Splits text node, calls iterator function, merges text node.
            function callIterator() {

                var // the result of the iterator call
                    result = null;

                // split text node if specified
                if (split) {
                    splitTextNode(node, start, end, ranges, index);
                    start = 0;
                    end = node.nodeValue.length;
                }

                // call iterator function
                result = iterator.call(context, node, start, end, range, index, ranges);

                // merge text node if specified
                if ((result !== Utils.BREAK) && _.isFunction(merge)) {

                    // try to merge with previous sibling span
                    if (start === 0) {
                        mergeSiblingTextNode(node, false, ranges, index);
                    }
/*
                    // try to merge with previous sibling span
                    if ((start === 0) && (mergeSiblingTextNode(node, start, end, index, false) === lastTextNode)) {
                        lastTextNode = lastRange = null;
                    }

                    // Try to merge the text node visited in the previous
                    // iteration step with its next sibling. This cannot be done
                    // before, otherwise merging with next text node may remove
                    // nodes from the DOM that are still selected in following
                    // ranges.
                    if (lastTextNode) {
                        mergeSiblingTextNode(lastTextNode, lastRange, true);
                    }

                    // remember current text node and range for next iteration step
                    if (end === node.nodeValue.length) {
                        lastTextNode = node;
                        lastRange = range;
                    } else {
                        lastTextNode = lastRange = null;
                    }
*/
                }

                return result;
            }

            // call passed iterator for all text nodes, but skip empty text nodes
            // unless the entire text range consists of this empty text node
            if ((node.nodeType === 3) && (isCursor || node.nodeValue.length)) {
                // calculate/validate start/end offset in the text node
                start = (node === range.start.node) ? Math.min(Math.max(range.start.offset, 0), node.nodeValue.length) : 0;
                end = (node === range.end.node) ? Math.min(Math.max(range.end.offset, start), node.nodeValue.length) : node.nodeValue.length;
                // call iterator for the text node, return if iterator returns Utils.BREAK
                if (callIterator() === Utils.BREAK) { return Utils.BREAK; }
            } else if (isCursor && (Utils.getNodeName(node) === 'br')) {
                // cursor selects a single <br> element, visit last preceding text node instead
                node = node.previousSibling;
                if (node && (Utils.getNodeName(node) === 'span')) {
                    node = node.lastChild;
                }
                if (node && Utils.isTextNode(node)) {
                    // prepare start, end, and current DOM range object
                    start = range.start.offset = end = range.end.offset = node.nodeValue.length;
                    range.start.node = range.end.node = node;
                    // call iterator for the text node, return if iterator returns Utils.BREAK
                    if (callIterator() === Utils.BREAK) { return Utils.BREAK; }
                }
            }
        });
/*
        // final merge with following text node
        if (lastTextNode) {
            mergeSiblingTextNode(lastTextNode, true);
        }
*/
    };

    // browser selection ------------------------------------------------------

    /**
     * Returns an array of DOM ranges representing the current browser
     * selection.
     *
     * @param {HTMLElement|jQuery} rootNode
     *  The container element the returned selection will be restricted to.
     *  Only ranges inside this root element will be included in the array.
     *
     * @returns {DOM.Range[]}
     *  The DOM ranges representing the current browser selection.
     */
    DOM.getBrowserSelection = function (rootNode) {

        var // the browser selection
            selection = window.getSelection(),
            // an array of all text ranges
            ranges = [],
            // a single range object
            range = null,
            // the limiting point for valid ranges (next sibling of root node)
            globalEndPos = null;

        // convert parameter to DOM element
        rootNode = Utils.getDomNode(rootNode);

        // end position if the range selects the entire root node
        globalEndPos = DOM.Point.createPointForNode(rootNode);
        globalEndPos.offset += 1;

        // build an array of text range objects holding start and end nodes/offsets
        for (var index = 0; index < selection.rangeCount; index += 1) {

            // get the native selection Range object
            range = selection.getRangeAt(index);

            // translate to the internal text range representation
            range = DOM.Range.createRange(range.startContainer, range.startOffset, range.endContainer, range.endOffset);

            // check that the nodes are inside the root node
            if (rootNode.contains(range.start.node) && (DOM.Point.comparePoints(range.end, globalEndPos) <= 0)) {
                ranges.push(range);
            }
        }

        return ranges;
    };

    /**
     * Sets the browser selection to the passed DOM ranges.
     *
     * @param {DOM.Range[]|DOM.Range} ranges
     *  The DOM ranges representing the new browser selection. May be an array
     *  of DOM range objects, or a single DOM range object.
     */
    DOM.setBrowserSelection = function (ranges) {

        var // the browser selection
            selection = window.getSelection();

        // process all passed text ranges
        selection.removeAllRanges();
        _.chain(ranges).getArray().each(function (range) {
            try {
                var docRange = window.document.createRange();
                docRange.setStart(range.start.node, range.start.offset);
                docRange.setEnd(range.end.node, range.end.offset);
                selection.addRange(docRange);
            } catch (ex) {
                Utils.warn('DOM.setBrowserSelection(): failed to add range to selection');
            }
        });
    };

    // exports ================================================================

    return DOM;

});
