package com.aiface.shared.data.codec

import com.aiface.shared.domain.model.Mutation
import com.aiface.shared.domain.model.SceneDocument

sealed interface DisplayMessage {
    data object Hello : DisplayMessage

    data class SetScene(
        val scene: SceneDocument,
    ) : DisplayMessage

    data class ApplyMutations(
        val mutations: List<Mutation>,
    ) : DisplayMessage

    data class Reset(
        val reason: String?,
    ) : DisplayMessage
}
