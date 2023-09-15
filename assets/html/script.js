var canvas = new fabric.Canvas('canvas');
canvas.isDrawingMode = false;   // Disable Fabric's built-in drawing mode

function updateStatusBar(message) {
    document.getElementById('status-bar').innerText = "Status: " + message;
}

var isDrawing = false;
var startingPoint;
var activeRectangle;
var isSelecting = false;
var selectionRect;
const ROUND_ALL = false;
var WASM_isReady = false;

// Enter the rectangle drawing mode
function enterDrawingMode() {
    canvas.selection = false;       // Disable selection
    canvas.forEachObject(function(o) {
        o.selectable = false;       // Make all objects non-selectable
    });

    isDrawing = true;
    isSelecting = false;
    updateStatusBar("Drawing");
}

function exitDrawingMode() {
    isDrawing = false;
    updateStatusBar("Idle");

    canvas.selection = true;       // Disable selection
    canvas.forEachObject(function(o) {
        o.selectable = true;
    });
}

function enterSelectionMode() {
    isSelecting = true;
    updateStatusBar("Selecting");
}

// Button events
canvas.on('mouse:down', function(o) {
    if (isDrawing) {
        let pointer = canvas.getPointer(o.e);
        startingPoint = { x: pointer.x, y: pointer.y };

        activeRectangle = new fabric.Rect({
            left: startingPoint.x,
            top: startingPoint.y,
            width: 0,
            height: 0,
            fill: 'transparent',
            stroke: 'black',
            strokeWidth: 1,
            selectable: false
        });

        canvas.add(activeRectangle);
    }
});
canvas.on('mouse:move', function(o) {
    if (!isDrawing || !activeRectangle) return;

    let pointer = canvas.getPointer(o.e);

    activeRectangle.set({
        width: pointer.x - startingPoint.x,
        height: pointer.y - startingPoint.y
    });
    canvas.renderAll();
});
canvas.on('mouse:up', function() {
    if (isDrawing) {
        normalizeRect(activeRectangle);
        // Note the order of renderAll() and setCoords()
        canvas.renderAll();
        activeRectangle.setCoords();
        // If you change dimension or position affecting properties you have to call object.setCoords()
        // after changing the property. Otherwise the "click area" of the object is wrong.

        activeRectangle = null;
    }
});



// Change the mode to drawing
document.querySelector('#draw').addEventListener('click', () => {
    if (!isDrawing) {
        enterDrawingMode();
    } else {
        exitDrawingMode();
    }
});

// Change the mode to selection
document.querySelector('#select').addEventListener('click', () => {
    if (isDrawing) {
        exitDrawingMode();
    }
    enterSelectionMode();
});

// Clear the canvas
document.querySelector('#clear').addEventListener('click', () => {
    canvas.clear();
});

/**
 * Check if two rectangles intersect.
 * @param {Array} rect1 - First rectangle [x0, y0, x1, y1]
 * @param {Array} rect2 - Second rectangle [x0, y0, x1, y1]
 * @returns {boolean} - True if the rectangles intersect, else false.
 */
function isIntersect(rect1, rect2) {
    return (rect1[0] < rect2[2] && rect1[2] > rect2[0] &&
            rect1[1] < rect2[3] && rect1[3] > rect2[1]);
}

/**
 * Check if any two rectangles in a list intersect.
 * @param {Array} rectangles - List of rectangles.
 * @returns {boolean} - True if any rectangles intersect, else false.
 */
function anyIntersect(rectangles) {
    for (let i = 0; i < rectangles.length; i++) {
        for (let j = i + 1; j < rectangles.length; j++) {
            if (isIntersect(rectangles[i], rectangles[j])) {
                return true;
            }
        }
    }
    return false;
}

function checkIntersectBoundary(rectangles, boundary) {
    for (let i = 0; i < rectangles.length; i++) {
        let r = rectangles[i];
        let f = boundary[0]<=r[0] && boundary[1]<=r[1] && r[2]<=boundary[2] && r[3]<=boundary[3];
        if (!f)
            return true;
    }
    return false;
}

// function normalizeRect() {
//     // https://github.com/fabricjs/fabric.js/issues/3527
//     // canvas.forEachObject(function(obj) {});
//     let l = canvas.getObjects();
//     for (let i = l.length-1; i >= 0; i--)
//         if(l[i].type === 'rect') {
//             let l=l[i].left, t=l[i].top, w=l[i].width, h=l[i].height;
//             if( w == 0 || h == 0) {
//                 // console.log('remove zero w/h rect:', l[i]);
//                 canvas.remove(l[i]);
//             }
//             if( w<0 ) { l[i].setLeft(l+w);l[i].setWidth(-w); }
//             if( h<0 ) { l[i].setTop(t+h); l[i].setHeight(-h); }
//             l[i].setStrokeWidth = 1;
//             l[i].setCoords()
//         }
//     canvas.renderAll()
// }

function test_intersect() {
    let rectangles = [];
    canvas.forEachObject(function(obj) {
        if (obj.type === 'rect') {
            rectangles.push([obj.left, obj.top, obj.left+obj.width, obj.top+obj.height]);
        }
    });
    // console.log(rectangles);
    console.log('Rects intersect?', anyIntersect(rectangles));
    console.log('Rects out of canvas?', checkIntersectBoundary(rectangles, [0,0,canvas.width,canvas.height]));

    return (anyIntersect(rectangles) || checkIntersectBoundary(rectangles, [0,0,canvas.width,canvas.height]));
}

// Export all rectangles to a text file and copy to clipboard
document.querySelector('#export').addEventListener('click', () => {
    if (test_intersect()===true) {
        alert('Please remove the overlapped/out-of-bound rectangles\n');

    }

    let rectangle = [];
    let rectangle_str = [];
    canvas.forEachObject(function(obj) {
        if (obj.type === 'rect') {
            x = obj.left + obj.width/2;
            y = obj.top + obj.height/2;
            if(obj.width<0 || obj.height<0) {
                console.log('negative width or height!');
            }
            rectangle.push(x, y, obj.width, obj.height);
            rectangle_str.push(`center x, y, x-width, y-height : ${x.toFixed(2)}, ${y.toFixed(2)}, ${obj.width.toFixed(2)}, ${obj.height.toFixed(2)}`);
        }
    });

    let textFileContent = rectangle_str.join('\n');

    // Copying to clipboard
    // navigator.clipboard.writeText(textFileContent).then(function() {
    //     console.log('Copied to clipboard successfully!');
    // }).catch(function(err) {
    //     console.error('Could not copy text: ', err);
    // });

    alert('Exported text has been copied to the clipboard.\n'+textFileContent);
    if (WASM_isReady) {
        console.log(textFileContent);
        console.log(Module.call_get_C_mat);

        // rectangle = [96.5, 142, 93, 114, 256, 156.5, 112, 129, 202, 307, 358, 88, 401.5, 177, 65, 72];
        //  6.1551   -2.9068   -2.8158   -0.1604   -0.2721
        // -2.9068    9.4598   -4.0456   -2.3532   -0.1543
        // -2.8158   -4.0456    9.4078   -1.9552   -0.5911
        // -0.1604   -2.3532   -1.9552    4.7080   -0.2391
        // -0.2721   -0.1543   -0.5911   -0.2391    0.6461
        let rect = new Module.VectorDouble();
        rectangle.forEach(val => rect.push_back(val));
        Module.call_get_C_mat(rect);
    }
});

// Key bindings
document.addEventListener('keydown', function(event) {
    switch (event.key) {
        case 'Delete':
            if(isSelecting) {
                var currentSelectedObjects = canvas.getActiveObjects();
                console.log(currentSelectedObjects);
                canvas.selection = false;

                for (var i = 0, length = currentSelectedObjects.length; i < length; i++) {
                    currentSelectedObjects[i].selectable = false;
                    canvas.remove(currentSelectedObjects[i]);
                }
                canvas.selection = true;
            }
            break;
        case 'Escape':
            if (isDrawing) {
                exitDrawingMode();
            }
            updateStatusBar("Idle");

            canvas.discardActiveObject().renderAll();
            break;
        case 'd':
            if (!isDrawing) {
                enterDrawingMode();
            }
            break;
        case 's':
            if (isDrawing) {
                exitDrawingMode();
            }
            enterSelectionMode();
            break;
        case 'a':
            canvas.setActiveGroup(new fabric.ActiveSelection(canvas.getObjects(), {
                canvas: canvas
            }));
            canvas.requestRenderAll();
            break;
    }
});

function normalizeRect(rect) {
    // Check for negative width
    if (rect.width < 0) {
        rect.left += rect.width;
        rect.width *= -1;
    }

    // Check for negative height
    if (rect.height < 0) {
        rect.top += rect.height;
        rect.height *= -1;
    }
    if (ROUND_ALL) {
        rect.width = Math.round(rect.width);
        rect.height = Math.round(rect.height);
        rect.left = Math.round(rect.left);
        rect.top = Math.round(rect.top);
    }
    console.log(rect);
}
// canvas.on('object:added', function(e) {
//     if (e.target.type === 'rect') {
//         normalizeRect(e.target);
//         canvas.renderAll();
//     }
// });

// canvas.on('object:modified', function(e) {
//     if (e.target.type === 'rect') {
//         normalizeRect(e.target);
//         canvas.renderAll();
//     }
// });
