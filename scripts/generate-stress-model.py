"""
Generate a tiny ONNX stress classifier model for EZKL ZK circuit compilation.

Architecture: Single dense layer with sigmoid activation.
  Input:  5 floats [leftEyeAspect, rightEyeAspect, browTension, mouthTension, timeNorm]
  Output: 1 float  (stress probability, threshold at 0.5)

Requirements: pip install onnx numpy
Run: python scripts/generate-stress-model.py
"""

import numpy as np

try:
    import onnx
    from onnx import helper, TensorProto, numpy_helper
except ImportError:
    print("ERROR: onnx package required. Install: pip install onnx numpy")
    exit(1)

W = np.array([[-2.0, -2.0, 3.0, 1.5, 0.1]], dtype=np.float32)
b = np.array([0.5], dtype=np.float32)

X = helper.make_tensor_value_info("input", TensorProto.FLOAT, [1, 5])
Y = helper.make_tensor_value_info("output", TensorProto.FLOAT, [1, 1])

W_init = numpy_helper.from_array(W, name="weight")
b_init = numpy_helper.from_array(b, name="bias")

matmul = helper.make_node("MatMul", ["input", "weight"], ["matmul_out"])
add = helper.make_node("Add", ["matmul_out", "bias"], ["add_out"])
sigmoid = helper.make_node("Sigmoid", ["add_out"], ["output"])

graph = helper.make_graph(
    [matmul, add, sigmoid],
    "stress_classifier",
    [X],
    [Y],
    initializer=[W_init, b_init],
)

model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 13)])
model.ir_version = 7

onnx.checker.check_model(model)
onnx.save(model, "public/ezkl/model.onnx")
print("Saved: public/ezkl/model.onnx")
