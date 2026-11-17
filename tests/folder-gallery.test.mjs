import test from 'node:test';
import assert from 'node:assert/strict';
import { assignmentInfo, namesForImage, normalizeImageName, imageNameFromFile, uniqueImageName, filterFolderImages, folderImages, sortRequest } from '../gallery/src/folder-gallery-model.js';

const images=folderImages('Alex',['beach.png','a b.jpg','../x.png','nested/y.png',5],'Alex');
const assignments={beach:{path:'user/images/Alex/beach.png',description:'Sunny shore'},old_beach:'user/images/Alex/beach.png',night:{path:'user/images/Alex/night.png'}};

test('folder images ignore unsafe or nested names and encode sources', () => {
    assert.deepEqual(images.map(i=>i.name),['beach.png','a b.jpg']);
    assert.equal(images[1].src,'/user/images/Alex/a%20b.jpg');
    assert.throws(()=>folderImages('Alex',{}),/Invalid gallery file list/);
});

test('assignment lookup finds every alias for one file', () => {
    assert.deepEqual(namesForImage(assignments,images[0].src),['beach','old_beach']);
    assert.deepEqual(assignmentInfo(assignments,images[0].src),{name:'beach',names:['beach','old_beach'],description:'Sunny shore'});
    assert.equal(assignmentInfo(assignments,images[1].src).name,null);
});

test('names are normalized and kept unique per gallery', () => {
    assert.equal(normalizeImageName('  red  dress '),'red_dress');
    assert.equal(normalizeImageName('a::b'),'a_b');
    assert.equal(normalizeImageName('   '),'');
    assert.equal(imageNameFromFile('user/images/Alex/My Photo.final.png'),'My_Photo.final');
    assert.equal(imageNameFromFile('.png'),'image');
    assert.equal(uniqueImageName('beach',assignments,'user/images/Alex/beach.png'),'beach');
    assert.equal(uniqueImageName('beach',assignments,'user/images/Alex/beach-2.png'),'beach_2');
    assert.equal(uniqueImageName('night',{...assignments,night_2:{path:'x/y.png'}},'user/images/Alex/n.png'),'night_3');
});

test('filters combine search with named/unnamed status', () => {
    assert.deepEqual(filterFolderImages(images,assignments,{status:'named'}).map(i=>i.name),['beach.png']);
    assert.deepEqual(filterFolderImages(images,assignments,{status:'unnamed'}).map(i=>i.name),['a b.jpg']);
    assert.deepEqual(filterFolderImages(images,assignments,{search:'sunny'}).map(i=>i.name),['beach.png']);
    assert.deepEqual(sortRequest('name-asc'),{sortField:'name',sortOrder:'asc'});
    assert.deepEqual(sortRequest(undefined),{sortField:'date',sortOrder:'desc'});
});
