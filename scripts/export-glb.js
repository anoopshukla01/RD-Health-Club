import fs from 'fs';

// Polyfill FileReader for Node.js
class NodeFileReader {
  constructor() {
    this.result = null;
    this.onload = null;
  }
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      if (this.onload) this.onload({ target: this });
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = 'data:application/octet-stream;base64,' + Buffer.from(buf).toString('base64');
      if (this.onload) this.onload({ target: this });
    });
  }
}
global.FileReader = NodeFileReader;

const THREE = await import('three');
const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');

const lifter = new THREE.Group();
lifter.name = 'RDLifter';

const skinMat = new THREE.MeshStandardMaterial({ color: 0x16161c, roughness: 0.35, metalness: 0.65 });
const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf5f5fa, roughness: 0.12, metalness: 0.98 });
const redMat = new THREE.MeshStandardMaterial({ color: 0xff1f24, roughness: 0.25, metalness: 0.5, emissive: 0x880e12 });
const blackPlateMat = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.55, metalness: 0.28 });

// Thorax
const thorax = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.64, 1.15, 16), skinMat);
thorax.position.set(0, 0.78, 0);
thorax.scale.set(1.22, 1.0, 0.75);
lifter.add(thorax);

// Head
const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.46, 0.42), skinMat);
head.position.set(0, 1.76, 0.08);
lifter.add(head);

// Barbell
const barbell = new THREE.Group();
barbell.name = 'Barbell';
const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 4.4, 24), chromeMat);
bar.rotation.z = Math.PI / 2;
barbell.add(bar);

// Plates
[-1.52, 1.52].forEach(x => {
  const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.09, 32), blackPlateMat);
  p1.rotation.z = Math.PI / 2;
  p1.position.x = x;
  barbell.add(p1);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.67, 0.024, 12, 32), redMat);
  ring.rotation.y = Math.PI / 2;
  ring.position.x = x;
  barbell.add(ring);
});

barbell.position.set(0, 0.05, 0.58);
lifter.add(barbell);

const exporter = new GLTFExporter();
exporter.parse(
  lifter,
  (gltf) => {
    fs.writeFileSync('public/assets/models/lifter.gltf', JSON.stringify(gltf, null, 2));
    console.log('Successfully saved public/assets/models/lifter.gltf! Size:', fs.statSync('public/assets/models/lifter.gltf').size);
    process.exit(0);
  },
  (err) => {
    console.error('Export error:', err);
    process.exit(1);
  },
  { binary: false }
);
