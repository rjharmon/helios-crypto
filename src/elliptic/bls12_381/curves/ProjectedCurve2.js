import { ShortProjected } from "../../common/index.js"
import { CURVE1 } from "../constants.js"
import { F2, F12, F6 } from "../fields/index.js"

/**
 * @template T
 * @typedef {import("../../common/index.js").Point3<T>} Point3
 */

/**
 * @typedef {import("../fields/index.js").FieldElement6} FieldElement6
 */

/**
 * @typedef {import("../fields/index.js").FieldElement12} FieldElement12
 */

/**
 * @type {FieldElement6}
 */
const ut_root = [F2.ZERO, F2.ONE, F2.ZERO]

/**
 * TODO: Evaluate this constant
 * @type {FieldElement12}
 */
const wsq = [ut_root, F6.ZERO]

/**
 * TODO: Evaluate this constant
 * @type {FieldElement12}
 */
const wcu = [F6.ZERO, ut_root]

const wsq_inv = F12.invert(wsq)
const wcu_inv = F12.invert(wcu)

// 1 / F2(2)^((p-1)/3) in GF(p²)
const PSI2_C1 =
    0x1a0111ea397fe699ec02408663d4de85aa0d857d89759ad4897d29650fb85f9b409427eb4f49fffd8bfd00000000aaacn

/**
 * @extends {ShortProjected<[bigint, bigint]>}
 */
class ProjectedCurve2 extends ShortProjected {
    constructor() {
        super(F2, [4n, 4n])
    }

    /**
     * @param {Point3<[bigint, bigint]>} point
     * @returns {Point3<[bigint, bigint]>}
     */
    scalex(point) {
        return this.scale(point, -CURVE1.X)
    }

    /**
     *
     * @param {Point3<[bigint, bigint]>} point
     * @returns {Point3<[bigint, bigint]>}
     */
    psi(point) {
        const { x, y } = this.toAffine(point)

        // Untwist Fp2->Fp12 && frobenius(1) && twist back
        const x2 = F12.multiply(
            F12.powp(F12.multiplyF2(wsq_inv, x), 1),
            wsq
        )[0][0]
        const y2 = F12.multiply(
            F12.powp(F12.multiplyF2(wcu_inv, y), 1),
            wcu
        )[0][0]

        return this.fromAffine({ x: x2, y: y2 })
    }

    /**
     * @param {Point3<[bigint, bigint]>} point
     * @returns {Point3<[bigint, bigint]>}
     */
    psi2(point) {
        const { x, y } = this.toAffine(point)

        return this.fromAffine({ x: F2.scale(x, PSI2_C1), y: F2.negate(y) })
    }

    /**
     * Maps the point into the prime-order subgroup G2.
     * clear_cofactor_bls12381_g2 from cfrg-hash-to-curve-11
     * https://eprint.iacr.org/2017/419.pdf
     * @param {Point3<[bigint, bigint]>} P
     * @returns {Point3<[bigint, bigint]>}
     */
    clearCofactor(P) {
        let t1 = this.scalex(P) // [-x]P
        let t2 = this.psi(P) // Ψ(P)
        let t3 = this.add(P, P) // 2P
        t3 = this.psi2(t3) // Ψ²(2P)
        t3 = this.subtract(t3, t2) // Ψ²(2P) - Ψ(P)
        t2 = this.add(t1, t2) // [-x]P + Ψ(P)
        t2 = this.scalex(t2) // [x²]P - [x]Ψ(P)
        t3 = this.add(t3, t2) // Ψ²(2P) - Ψ(P) + [x²]P - [x]Ψ(P)
        t3 = this.subtract(t3, t1) // Ψ²(2P) - Ψ(P) + [x²]P - [x]Ψ(P) + [x]P
        const Q = this.subtract(t3, P) // Ψ²(2P) - Ψ(P) + [x²]P - [x]Ψ(P) + [x]P - 1P =>
        return Q // [x²-x-1]P + [x-1]Ψ(P) + Ψ²(2P)
    }
}

export const projectedCurve2 = new ProjectedCurve2()
