export function zeros(rows, columns = rows) {
  return Array.from({ length: rows }, () => Array(columns).fill(0));
}

export function solveLinearSystem(matrix, vector, tolerance = 1e-11) {
  const n = vector.length;
  if (matrix.length !== n || matrix.some((row) => row.length !== n)) {
    throw new Error('Matrix must be square and match the vector length.');
  }

  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let pivot = 0; pivot < n; pivot += 1) {
    let maxRow = pivot;
    for (let row = pivot + 1; row < n; row += 1) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[maxRow][pivot])) maxRow = row;
    }

    if (Math.abs(augmented[maxRow][pivot]) < tolerance) {
      throw new Error('The selected restraints form an unstable or ill-conditioned system.');
    }

    [augmented[pivot], augmented[maxRow]] = [augmented[maxRow], augmented[pivot]];

    const divisor = augmented[pivot][pivot];
    for (let column = pivot; column <= n; column += 1) augmented[pivot][column] /= divisor;

    for (let row = 0; row < n; row += 1) {
      if (row === pivot) continue;
      const factor = augmented[row][pivot];
      if (Math.abs(factor) < tolerance) continue;
      for (let column = pivot; column <= n; column += 1) {
        augmented[row][column] -= factor * augmented[pivot][column];
      }
    }
  }

  return augmented.map((row) => row[n]);
}
