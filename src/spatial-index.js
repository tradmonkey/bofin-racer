// Broad phase only: callers retain their existing exact distance/collision tests.
export function spatialIndex(items, bounds, cellSize = 80) {
  const cells = new Map();
  items.forEach((item, index) => {
    const [x0,z0,x1,z1] = bounds(item);
    for(let x=Math.floor(x0/cellSize);x<=Math.floor(x1/cellSize);x++)
      for(let z=Math.floor(z0/cellSize);z<=Math.floor(z1/cellSize);z++) {
        const key=`${x},${z}`;
        if(!cells.has(key))cells.set(key,[]);
        cells.get(key).push(index);
      }
  });
  return (x,z,radius=0) => {
    const found = new Set();
    for(let i=Math.floor((x-radius)/cellSize);i<=Math.floor((x+radius)/cellSize);i++)
      for(let j=Math.floor((z-radius)/cellSize);j<=Math.floor((z+radius)/cellSize);j++)
        for(const index of cells.get(`${i},${j}`)||[])found.add(index);
    return [...found].sort((a,b)=>a-b).map(index=>items[index]);
  };
}
export const roadBounds = road => {
  const [a,b]=road.points;
  return [Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[0],b[0]),Math.max(a[1],b[1])];
};
