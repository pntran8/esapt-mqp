import { ElementTree, Element, SubElement } from 'elementtree'

const chenMap1 = new Map<string, string>([
    ['end_style', 'endArrow=open;endFill=1;startArrow=none;startFill=0;'],
    ['start_style', 'endArrow=none;endFill=0;startArrow=open;startFill=1;']
]);
const chenMapN = new Map<string, string>([
    ['value', '1..*']
]);
const chenMapM = new Map<string, string>([
    ['value', '1..*'],
]);
const chenMap = new Map<string, Map<string, string>>([
    ['1', chenMap1],
    ['N', chenMapN],
    ['M', chenMapM]
]);
const crowMap1 = new Map<string, string>([
    ['end_style', 'endArrow=ERmandOne;endFill=0;startArrow=none;startFill=0;'],
    ['start_style', 'endArrow=none;endFill=0;startArrow=ERmandOne;startFill=0;']
]);
const crowMapN = new Map<string, string>([
    ['end_style', 'endArrow=ERmany;endFill=0;startArrow=none;startFill=0;'],
    ['start_style', 'endArrow=none;endFill=0;startArrow=ERmany;startFill=0;']
]);
const crowMapM = new Map<string, string>([
    ['end_style', 'endArrow=ERmany;endFill=0;startArrow=none;startFill=0;'],
    ['start_style', 'endArrow=none;endFill=0;startArrow=ERmany;startFill=0;']
]);
const crowMap = new Map<string, Map<string, string>>([
    ['1', crowMap1],
    ['N', crowMapN],
    ['M', crowMapM]
]);
const styleMap = new Map<string, Map<string, Map<string, string>>>([
    ['chen(adapted)', chenMap],
    ['crow', crowMap]
]);


const updateShapeMap = (tree) => {

}

const generate_drawio_with_arrows = (input_file, chen_output_file, crow_output_file) => {
    //Parse original XML once
    const tree = ElementTree.parse(input_file);
    //console.log("File Contents: ", tree);

    const root = tree.getRootNode();
    //console.log("Extract root: ", root)

    updateShapeMap(tree);

    //copy for each output version
    const chen_tree = tree;
    const crow_tree = tree;

    applyArrowStyles(chen_tree, styleMap.get('chen(adapted)'));
    chen_tree.write(chen_output_file);

    applyArrowStyles(crow_tree, styleMap.get('crow'));
    crow_tree.write(crow_output_file);
}

const applyArrowStyles = (tree, styleMap) => {
    const root = tree.getRootNode();
    for(let i = 0; i < tree.children.length; i++) {

    }
}