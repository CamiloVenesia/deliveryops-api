
import {
    dispatchRecommendationService
} from '../services/dispatch-recommendation.service.js';

export const dispatchController = {
    async recommendations(req, res) {
        const result =
            await dispatchRecommendationService.getCandidates(
                req.query
            );

        res.json(result);
    }
};
